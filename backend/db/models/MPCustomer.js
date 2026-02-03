/**
 * MP Customer Model
 * Stores Mercado Pago customer records
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const mpCustomerSchema = new mongoose.Schema(
  {
    // Unique Identifier
    id: {
      type: String,
      default: () => `mpcust_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
      unique: true,
      index: true,
    },

    // Relationship to our User
    userId: {
      type: String,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },

    // Mercado Pago Customer ID
    mpCustomerId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Customer Info
    email: {
      type: String,
      required: true,
      index: true,
    },
    firstName: String,
    lastName: String,

    // Identification
    identification: {
      type: {
        type: String,
        enum: ['CPF', 'CNPJ', 'DNI', 'CI', 'LC', 'LE', 'RUT', 'CC', 'CE', 'NIT', null],
      },
      number: String,
    },

    // Contact
    phone: {
      areaCode: String,
      number: String,
    },

    // Address
    address: {
      id: String,
      zipCode: String,
      streetName: String,
      streetNumber: Number,
      city: String,
      state: String,
      country: String,
    },

    // Default Address
    defaultAddress: String,

    // Default Card
    defaultCard: String,

    // Cards (stored references)
    cards: [{
      mpCardId: String,
      lastFourDigits: String,
      expirationMonth: Number,
      expirationYear: Number,
      paymentMethodId: String,
      issuerId: String,
      issuerName: String,
      cardholderName: String,
      isDefault: Boolean,
      dateCreated: Date,
    }],

    // Registration Date from MP
    dateRegistered: Date,
    dateCreated: Date,
    dateLastUpdated: Date,

    // Metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },

    // Status
    status: {
      type: String,
      enum: ['active', 'inactive', 'deleted'],
      default: 'active',
      index: true,
    },

    // Full MP Response
    mpResponse: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    collection: 'mp_customers',
  }
);

// Indexes
mpCustomerSchema.index({ userId: 1, email: 1 });
mpCustomerSchema.index({ mpCustomerId: 1 });

/**
 * Get customer summary
 */
mpCustomerSchema.methods.getSummary = function () {
  return {
    id: this.id,
    mpCustomerId: this.mpCustomerId,
    email: this.email,
    firstName: this.firstName,
    lastName: this.lastName,
    cardsCount: this.cards?.length || 0,
    status: this.status,
    createdAt: this.createdAt,
  };
};

/**
 * Add card to customer
 */
mpCustomerSchema.methods.addCard = function (cardData) {
  this.cards.push({
    mpCardId: cardData.id,
    lastFourDigits: cardData.last_four_digits,
    expirationMonth: cardData.expiration_month,
    expirationYear: cardData.expiration_year,
    paymentMethodId: cardData.payment_method?.id,
    issuerId: cardData.issuer?.id,
    issuerName: cardData.issuer?.name,
    cardholderName: cardData.cardholder?.name,
    isDefault: this.cards.length === 0,
    dateCreated: cardData.date_created,
  });
};

/**
 * Remove card from customer
 */
mpCustomerSchema.methods.removeCard = function (mpCardId) {
  this.cards = this.cards.filter(c => c.mpCardId !== mpCardId);
};

/**
 * Static: Find or create customer
 */
mpCustomerSchema.statics.findOrCreate = async function (userId, email, mpData) {
  let customer = await this.findOne({ userId, email });
  
  if (!customer) {
    customer = new this({
      userId,
      email,
      mpCustomerId: mpData.id,
      firstName: mpData.first_name,
      lastName: mpData.last_name,
      identification: mpData.identification,
      phone: mpData.phone,
      address: mpData.address,
      dateRegistered: mpData.date_registered,
      dateCreated: mpData.date_created,
      mpResponse: mpData,
    });
    await customer.save();
  }
  
  return customer;
};

/**
 * Static: Search customers
 */
mpCustomerSchema.statics.search = async function (userId, filters = {}) {
  const {
    email,
    status,
    limit = 20,
    offset = 0,
    sort = '-createdAt',
  } = filters;

  const query = { userId };

  if (email) query.email = { $regex: email, $options: 'i' };
  if (status) query.status = status;

  const customers = await this.find(query)
    .sort(sort)
    .limit(parseInt(limit))
    .skip(parseInt(offset))
    .select('-mpResponse');

  const total = await this.countDocuments(query);

  return {
    customers,
    total,
    limit: parseInt(limit),
    offset: parseInt(offset),
  };
};

module.exports = mongoose.model('MPCustomer', mpCustomerSchema);
