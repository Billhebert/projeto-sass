/**
 * Tipos do Mercado Livre SDK
 */

// ============================================
// AUTENTICAÇÃO
// ============================================

export interface Credentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_id: number;
  refresh_token?: string;
}

export interface AuthUrlParams {
  response_type: 'code' | 'token';
  client_id: string;
  redirect_uri: string;
  state?: string;
}

// ============================================
// USUÁRIOS
// ============================================

export interface User {
  id: number;
  nickname: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: Phone;
  address?: Address;
  user_type?: string;
  logo?: string;
  points?: number;
  site_id?: string;
  permalink?: string;
  created_date?: string;
  updated_date?: string;
  country_id?: string;
  identification?: Identification;
  billing_info?: BillingInfo;
  seller_info?: SellerInfo;
  status?: UserStatus;
  tags?: string[];
  logo_meli?: string;
  company?: Company;
  consumer_protection?: boolean;
}

export interface UserSearchResult {
  users: User[];
  paging: Paging;
}

export interface UserAddresses {
  id: number;
  user_id: number;
  address_lines: string[];
  zip_code: string;
  city: City;
  state: State;
  country: Country;
  neighborhood: Neighborhood;
  municipality: Municipality;
  types: string[];
  comment?: string;
  name?: string;
  phone?: string;
  default_address: boolean;
  recipient_name?: string;
}

export interface UserItemsSearch {
  users: UserItems[];
  paging: Paging;
}

export interface UserItems {
  user_id: number;
  total: number;
  items: Item[];
}

// ============================================
// ITENS E PUBLICAÇÕES
// ============================================

export interface Item {
  id: string;
  site_id: string;
  title: string;
  subtitle?: string;
  seller_id: number;
  category_id: string;
  price: number;
  base_price: number;
  original_price?: number;
  currency_id: string;
  initial_quantity: number;
  available_quantity: number;
  sold_quantity: number;
  listing_type_id: string;
  status: ItemStatus;
  date_created: string;
  last_updated: string;
  condition: ItemCondition;
  permalink: string;
  thumbnail: string;
  thumbnail_id?: string;
  pictures: Picture[];
  video_id?: string;
  descriptions: Description[];
  accepts_mercadopago: boolean;
  non_mercado_pago_payment_methods?: NonMercadoPagoPayment[];
  shipping?: Shipping;
  international_delivery_mode?: string;
  seller_address?: SellerAddress;
  seller_contact?: string;
  location?: Location;
  geolocation?: Geolocation;
  coverage_areas?: CoverageArea[];
  attributes: Attribute[];
  variations?: Variation[];
  warnings?: Warning[];
  listing_date?: string;
  domain_id?: string;
  parent_item_id?: string;
  differential_pricing?: DifferentialPricing;
  deal_ids?: string[];
  automatic_relist?: boolean;
  date_last_updated_original?: string;
  health?: number;
  catalog_product_id?: string;
  seller_custom_field?: string;
  parent_id?: string;
  dimensional_weight?: number;
  order_backend: number;
  sale_price?: Price;
  constructor?: any;
  attributes_inputted?: boolean;
  variations_enabled?: boolean;
  kit_description?: string;
  product_trace_id?: string;
  product_id?: string;
  sub_status?: string[];
  added_immediately?: boolean;
  show_email?: boolean;
  show_phone?: boolean;
  last_updated_original?: string;
  mandatory_relist?: boolean;
  price_config?: PriceConfig;
  minimum_price?: number;
  maximum_price?: number;
  status_original?: string;
  currency_original?: string;
}

export interface ItemSearch {
  site_id: string;
  query?: string;
  category?: string;
  seller_id?: number;
  offset?: number;
  limit?: number;
  order?: string;
}

export interface ItemSearchResult {
  site_id: string;
  query: string;
  paging: Paging;
  results: Item[];
  secondary_results: Item[];
  related_results: Item[];
  sort: Sort;
  available_sorts: Sort[];
  filters: Filter[];
  available_filters: Filter[];
}

export type ItemStatus = 'active' | 'paused' | 'closed' | 'under_review' | 'pre_translate' | 'blocked' | 'in_review' | 'validation_in_progress';
export type ItemCondition = 'new' | 'used' | 'not_specified';

export interface ItemDescription {
  id: string;
  item_id: string;
  text: string;
  plain_text?: string;
  last_updated: string;
  created_date: string;
}

export interface ItemPictures {
  pictures: Picture[];
}

// ============================================
// CATEGORIAS E ATRIBUTOS
// ============================================

export interface Category {
  id: string;
  name: string;
  permalink: string;
  picture?: string;
  total_items_in_this_category: number;
  path_from_root: CategoryPath[];
  children_categories: Category[];
  attribute_types: string;
  settings: CategorySettings;
  warnings?: Warning[];
}

export interface CategoryPath {
  id: string;
  name: string;
}

export interface CategorySettings {
  adult_content: boolean;
  booking: boolean;
  carrier_integrated: boolean;
  coverage_areas: string;
  fragile: boolean;
  immediate_payment: string;
  item_conditions: string[];
  items_reviews_allowed: boolean;
  mandatory_picture: boolean;
  maximum_price?: number;
  maximum_picture_height: number;
  maximum_picture_width: number;
  maximum_weight: number;
  minimum_price?: number;
  minimum_picture_height: number;
  minimum_picture_width: number;
  mode: string;
  other_payment_methods: string[];
  payment_method_categories: string[];
  prices: string;
  rounded_address: boolean;
  seller_contact: string;
  shipping_modes: string[];
  show_contact_information: boolean;
  simple_shipping: string;
  stock: string;
  sub_vertical: string;
  tags: string[];
  vertical: string;
  buyer_protection_programs: string[];
  catalog_listing: boolean;
}

export interface Attribute {
  id: string;
  name: string;
  value_id?: string;
  value_name?: string;
  value_struct?: ValueStruct;
  attribute_group_id?: string;
  attribute_group_name?: string;
}

export interface ValueStruct {
  number: number;
  unit: string;
}

export interface AttributeValue {
  id: string;
  name: string;
  path_from_root?: CategoryPath[];
}

// ============================================
// PEDIDOS
// ============================================

export interface Order {
  id: number;
  date_created: string;
  date_closed: string;
  last_updated: string;
  manufacturing_ending_date?: string;
  comment?: string;
  order_items: OrderItem[];
  order_snippet?: string;
  total_amount: number;
  currency_id: string;
  buyer: Buyer;
  seller: Seller;
  payments: Payment[];
  feedback: OrderFeedback;
  shipping: OrderShipping;
  tags: string[];
  related_orders?: RelatedOrder[];
  mediations?: Mediation[];
  pickup?: Pickup;
  package_id?: string;
  status: OrderStatus;
  order_request?: OrderRequest;
  context?: OrderContext;
}

export type OrderStatus = 'confirmed' | 'payment_in_process' | 'paid' | 'pending_confirm' | 'invalid' | 'not_paid' | 'partially_paid' | 'payment_in_mediation' | 'cancelled' | 'refunded' | 'unpaid' | 'reserved' | 'contested';

export interface OrderItem {
  item: Item;
  quantity: number;
  picked_quantity?: number;
  unit_price: number;
  full_unit_price: number;
  currency_id: string;
  manufacturing_days?: number;
  status: string;
}

export interface Buyer {
  id: number;
  nickname: string;
  email: string;
  phone?: Phone;
  first_name: string;
  last_name: string;
  billing_info?: BillingInfo;
}

export interface Seller {
  id: number;
  nickname: string;
  email: string;
  phone?: Phone;
  first_name: string;
  last_name: string;
}

export interface OrderFeedback {
  sale: SaleFeedback;
  purchase: PurchaseFeedback;
}

export interface SaleFeedback {
  rating: string;
  fulfilled: boolean;
  reason?: string;
  message?: string;
  date_created: string;
}

export interface OrderShipping {
  id: number;
  type: string;
  status: string;
  shipping_items: ShippingItem[];
  date_created: string;
  origin?: ShippingAddress;
  destination?: ShippingAddress;
  carrier?: string;
  carrier_id?: string;
  logistics_type?: string;
  method_id?: number;
  estimated_delivery?: EstimatedDelivery;
  substatus?: string;
  sent?: string;
  returned?: string;
  date_first_approved?: string;
  receiver_address?: ReceiverAddress;
  billing_info?: ShippingBillingInfo;
}

export interface OrderSearch {
  seller?: number;
  buyer?: number;
  status?: OrderStatus;
  offset?: number;
  limit?: number;
  order_id?: string;
  date_created?: string;
  order_status?: string;
}

export interface OrderSearchResult {
  orders: Order[];
  paging: Paging;
}

// ============================================
// ENVIO E FRETE
// ============================================

export interface Shipment {
  id: number;
  status: ShipmentStatus;
  substatus?: string;
  mode: string;
  created_date: string;
  order_id: number;
  order_snippet?: string;
  last_updated: string;
  tracking_number?: string;
  tracking_method?: string;
  service_id?: number;
  carrier_id?: string;
  carrier?: Carrier;
  sender_id: number;
  recipient_id: number;
  sender?: User;
  recipient?: User;
  origin?: ShippingAddress;
  destination?: ShippingAddress;
  shipping_items: ShippingItem[];
  shipping_option: ShippingOption;
  logistic_type: string;
  type: string;
  dom?: any;
  tags?: string[];
  return_id?: number;
  conversation_id?: number;
  cost_components?: CostComponents;
  billing_info?: ShipmentBillingInfo;
  sla?: Sla;
  delivery_preference?: string;
  estimated_delivery_final?: string;
  date_first_approved?: string;
  date_ready_to_ship?: string;
  date_shipped?: string;
  date_delivered?: string;
  package_id?: string;
  customs_info?: CustomsInfo;
  dimensions?: Dimensions;
 货运?: any;
  pickup?: Pickup;
  lead_time?: LeadTime;
  hash?: string;
  notification_queue?: string[];
  comments?: string;
  message?: string;
  error?: string;
  warehouse?: Warehouse;
  time_window?: TimeWindow;
  frequencies?: Frequency[];
  cost?: number;
  application_id?: number;
}

export type ShipmentStatus = 'pending' | 'ready_to_ship' | 'shipped' | 'delivered' | 'cancelled' | 'not_delivered' | 'returned';

export interface ShipmentSearchResult {
  shipments: Shipment[];
  paging: Paging;
}

export interface ShippingItem {
  id: string;
  description: string;
  quantity: number;
  dimensions?: Dimensions;
}

export interface ShippingOption {
  id: number;
  name: string;
  currency_id: string;
  base_cost: number;
  cost: number;
  discount?: Discount;
  app_selected?: number;
  estimated_delivery: EstimatedDelivery;
  delivery_type?: string;
}

export interface EstimatedDelivery {
  date: string;
  time_from?: string;
  time_to?: string;
  unit: string;
  lower_bound?: number;
  upper_bound?: number;
}

export interface ShippingAddress {
  address_line: string;
  city: City;
  state: State;
  country: Country;
  zip_code: string;
  latitude?: string;
  longitude?: string;
  no_number?: string;
  number?: string;
  apartment?: string;
  floor?: string;
  street_name?: string;
  street_number?: string;
  comment?: string;
}

export interface ShippingBillingInfo {
  billing_address: ShippingAddress;
  receiver_address: ReceiverAddress;
  doc_number: string;
  doc_type: string;
  vat_type: string;
}

export interface ReceiverAddress {
  id: number;
  address_line: string;
  zip_code: string;
  city: City;
  state: State;
  country: Country;
  street_name: string;
  street_number: string;
  floor?: string;
  apartment?: string;
  latitude: string;
  longitude: string;
}

export interface CostComponents {
  price: number;
  list_cost: number;
  sale_cost: number;
  order_cost: number;
  grand_total: number;
}

export interface Sla {
  date: string;
  shipping_time: ShippingTime;
}

export interface ShippingTime {
  date: string;
  unit: string;
  lower_bound: number;
  upper_bound: number;
}

export interface Dimensions {
  length: number;
  width: number;
  height: number;
  weight: number;
}

export interface Warehouse {
  id: string;
  name: string;
}

export interface TimeWindow {
  start: string;
  end: string;
}

export interface Frequency {
  frequency: string;
  enabled: boolean;
}

export interface Discount {
  type: string;
  value: number;
}

export interface CustomsInfo {
  id: number;
  type: string;
  doc_number: string;
  name: string;
}

export interface Carrier {
  id: string;
  name: string;
}

export interface LeadTime {
  handling_time: TimeWindow;
  shipping_time: TimeWindow;
}

// ============================================
// PAGAMENTOS
// ============================================

export interface Payment {
  id: number;
  order_id: number;
  payer_id: number;
  payer_email?: string;
  collector_id: number;
  currency_id: string;
  status: PaymentStatus;
  status_detail: string;
  transaction_amount: number;
  transaction_amount_refunded: number;
  currency_exchange_rate?: number;
  total_paid_amount: number;
  installment_amount?: number;
  financing_installed?: number;
  overpaid_amount: number;
  order_snippet?: string;
  date_created: string;
  date_approved?: string;
  date_last_modified: string;
  method_id: string;
  method_type: string;
  method_name: string;
  draft?: boolean;
  external_reference?: string;
  payment_method_id: string;
  payment_type: string;
  deferred_capture?: string;
  card?: Card;
  item_id: string;
  shipping_cost: number;
  buyer?: BuyerPaymentInfo;
  label?: string;
  statement_descriptor?: string;
  transaction_details: TransactionDetails;
  fee_details: FeeDetail[];
  date_of_first_expirable?: string;
  cardholder?: Cardholder;
}

export type PaymentStatus = 'pending' | 'approved' | 'authorized' | 'in_process' | 'in_mediation' | 'rejected' | 'cancelled' | 'refunded' | 'charged_back';

export interface TransactionDetails {
  external_resource_url?: string;
  payment_method_reference_id?: string;
  net_received_amount: number;
  total_paid_amount: number;
  overpaid_amount: number;
  installment_amount: number;
}

export interface FeeDetail {
  type: string;
  amount: number;
  fee_payer: string;
}

export interface Card {
  id: string;
  first_six_digits: string;
  last_four_digits: string;
  expiration_month: number;
  expiration_year: number;
  date_created: string;
  date_last_updated: string;
  cardholder: Cardholder;
}

export interface Cardholder {
  name: string;
  identification: Identification;
}

export interface BuyerPaymentInfo {
  id: number;
  email: string;
  nickname: string;
}

// ============================================
// PERGUNTAS E RESPOSTAS
// ============================================

export interface Question {
  id: number;
  item_id: string;
  seller_id: number;
  buyer_id: number;
  status: QuestionStatus;
  text: string;
  date_created: string;
  deleted_from_listing: boolean;
  hold: boolean;
  answer?: Answer;
  attachments: Attachment[];
}

export type QuestionStatus = 'UNANSWERED' | 'ANSWERED' | 'CLOSED_UNANSWERED' | 'BANNED';

export interface Answer {
  id: number;
  text: string;
  status: string;
  date_created: string;
  maybe_reply?: boolean;
}

export interface QuestionSearchResult {
  questions: Question[];
  paging: Paging;
}

export interface Attachment {
  id: number;
  temporary?: boolean;
  filename: string;
  filesize: number;
  date_created: string;
}

export interface MyQuestions {
  questions: Question[];
  paging: Paging;
}

// ============================================
// FEEDBACK
// ============================================

export interface SaleFeedback {
  rating: string;
  fulfilled: boolean;
  reason?: string;
  message?: string;
  date_created: string;
}

export interface PurchaseFeedback {
  rating: string;
  fulfilled: boolean;
  reason?: string;
  message?: string;
  date_created: string;
}

export interface OrderFeedback {
  sale: SaleFeedback;
  purchase: PurchaseFeedback;
}

export interface FeedbackReply {
  reply: string;
}

// ============================================
// MODERAÇÃO
// ============================================

export interface Moderation {
  id: string;
  date_created: string;
  user_id: number;
  related_element_id: string;
  element_type: string;
  reason: ModerationReason;
  status: string;
}

export interface ModerationReason {
  id: number;
  key: string;
  name: string;
  type: string;
  source: string;
}

export interface ModerationSearchResult {
  moderators: Moderation[];
  paging: Paging;
}

export interface ModerationLast {
  id: string;
  date_created: string;
  element_id: string;
  status: string;
}

// ============================================
// PROMOÇÕES
// ============================================

export interface Promotion {
  id: string;
  name: string;
  status: string;
  type: string;
  start_date: string;
  end_date: string;
  conditions: PromotionCondition[];
  benefits: PromotionBenefit[];
}

export interface PromotionCondition {
  type: string;
  parameters: Record<string, any>;
}

export interface PromotionBenefit {
  type: string;
  value: number;
  items?: string[];
}

export interface PromotionSearchResult {
  promotions: Promotion[];
  paging: Paging;
}

export interface Campaign {
  id: number;
  name: string;
  status: string;
  type: string;
  discount_type: string;
  discount_percentage?: number;
  discount_amount?: number;
  start_date: string;
  end_date: string;
  campaign_items: CampaignItem[];
}

export interface CampaignItem {
  item_id: string;
  price: number;
  original_price: number;
}

export interface CampaignSearchResult {
  campaigns: Campaign[];
  paging: Paging;
}

// ============================================
// FATURAMENTO
// ============================================

export interface FiscalDocument {
  id: number;
  type: string;
  document_number: string;
  series: string;
  number: string;
  date_created: string;
  date_issued?: string;
  status: string;
  items: FiscalDocumentItem[];
  buyer: Buyer;
  seller: Seller;
  total: number;
  currency_id: string;
}

export interface FiscalDocumentItem {
  id: number;
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface FiscalDocumentSearchResult {
  documents: FiscalDocument[];
  paging: Paging;
}

export interface TaxRule {
  id: number;
  name: string;
  type: string;
  conditions: TaxCondition[];
  rates: TaxRate[];
}

export interface TaxCondition {
  field: string;
  operator: string;
  value: string;
}

export interface TaxRate {
  tax: string;
  rate: number;
  exemption?: boolean;
}

export interface BillingPeriod {
  id: string;
  key: string;
  start_date: string;
  end_date: string;
  status: string;
}

export interface BillingSummary {
  total: number;
  currency_id: string;
  details: BillingDetail[];
}

export interface BillingDetail {
  type: string;
  amount: number;
  currency_id: string;
}

// ============================================
// MENSAGENS
// ============================================

export interface Message {
  id: string;
  from: MessageFrom;
  to: MessageTo[];
  subject?: string;
  text: string;
  rich_text?: string;
  status: string;
  message_date: string;
  received_date?: string;
  received_read_date?: string;
  deleted_from?: string;
  deleted_to?: string;
  attachment?: Attachment;
  app_id?: number;
  message_metadata?: MessageMetadata;
}

export interface MessageFrom {
  user_id: number;
  email: string;
  name: string;
}

export interface MessageTo {
  user_id: number;
  email: string;
  name: string;
}

export interface MessageMetadata {
  resource: string;
  resource_id: string;
  field: string;
}

export interface MessageSearchResult {
  messages: Message[];
  paging: Paging;
}

export interface MessageUnread {
  total: number;
  threads: Thread[];
}

export interface Thread {
  id: string;
  pack_id?: string;
  order_id?: string;
  shipment_id?: string;
  status: string;
  unread: boolean;
  messages: Message[];
}

// ============================================
// RECLAMAÇÕES E DEVOLUÇÕES
// ============================================

export interface Claim {
  id: string;
  type: string;
  stage: string;
  status: string;
  resource: string;
  resource_id: string;
  claimant: ClaimParticipant;
  respondent: ClaimParticipant;
  mediator: ClaimParticipant;
  amount: Money;
  context: ClaimContext;
  claim_items: ClaimItem[];
  date_created: string;
  date_closed?: string;
  last_updated: string;
  attachments: Attachment[];
  resolved_at?: string;
  partial_refund_available: boolean;
  evidence?: Evidence;
  actions: ClaimAction[];
  expected_resolutions: ExpectedResolution[];
  messages: ClaimMessage[];
  changes: ClaimChange[];
}

export interface ClaimParticipant {
  id: number;
  role: string;
  email: string;
  phone?: Phone;
  name: string;
}

export interface ClaimContext {
  id: string;
  key: string;
  label: string;
}

export interface ClaimItem {
  item_id: string;
  description: string;
  quantity: number;
  price: Money;
}

export interface Money {
  amount: number;
  currency_id: string;
}

export interface Evidence {
  id: string;
  attachments: Attachment[];
  claimed_objection: string;
}

export interface ClaimAction {
  id: string;
  type: string;
  label: string;
  available: boolean;
}

export interface ExpectedResolution {
  id: string;
  type: string;
  value: string;
  label: string;
}

export interface ClaimMessage {
  id: string;
  from: ClaimParticipant;
  text: string;
  date_created: string;
  attachments: Attachment[];
}

export interface ClaimChange {
  field: string;
  old_value: string;
  new_value: string;
  date_created: string;
}

export interface ClaimSearchResult {
  claims: Claim[];
  paging: Paging;
}

export interface Return {
  id: string;
  type: string;
  status: string;
  order_id: number;
  claim_id: string;
  item_id: string;
  reason: string;
  date_created: string;
  date_closed?: string;
  last_updated: string;
  customer: ReturnParticipant;
  seller: ReturnParticipant;
  refund: Money;
  shipment: ReturnShipment;
}

export interface ReturnParticipant {
  id: number;
  name: string;
  email: string;
  phone?: Phone;
}

export interface ReturnShipment {
  id: number;
  status: string;
  logistic_type: string;
}

export interface ReturnSearchResult {
  returns: Return[];
  paging: Paging;
}

// ============================================
// PUBLICIDADE
// ============================================

export interface Advertiser {
  id: number;
  name: string;
  type: string;
  status: string;
  campaigns: Campaign[];
}

export interface AdvertisingCampaign {
  id: number;
  name: string;
  status: string;
  type: string;
  budget: number;
  spent: number;
  start_date: string;
  end_date: string;
  targeting: CampaignTargeting;
  creatives: Creative[];
  metrics: CampaignMetrics;
}

export interface CampaignTargeting {
  sites: string[];
  categories: string[];
  keywords: string[];
  ages: AgeRange[];
  genders: string[];
}

export interface AgeRange {
  min: number;
  max: number;
}

export interface Creative {
  id: number;
  type: string;
  content: string;
  status: string;
}

export interface CampaignMetrics {
  impressions: number;
  clicks: number;
  ctr: number;
  cost: number;
  conversions: number;
  roas: number;
}

export interface ProductAd {
  id: string;
  item_id: string;
  campaign_id: number;
  ad_group_id?: number;
  status: string;
  bid: number;
  metrics: ProductAdMetrics;
}

export interface ProductAdMetrics {
  impressions: number;
  clicks: number;
  ctr: number;
  cost: number;
  conversions: number;
  roas: number;
  acos: number;
}

export interface AdGroup {
  id: number;
  name: string;
  campaign_id: number;
  default_bid: number;
  ads: ProductAd[];
}

export interface AdvertisingSearchResult {
  advertisers: Advertiser[];
  campaigns: AdvertisingCampaign[];
  paging: Paging;
}

// ============================================
// RELATÓRIOS
// ============================================

export interface Report {
  id: string;
  name: string;
  type: string;
  status: string;
  date_created: string;
  date_completed?: string;
  download_url?: string;
}

export interface ReportSearchResult {
  reports: Report[];
  paging: Paging;
}

// ============================================
// BUSCA
// ============================================

export interface SearchResult {
  site_id: string;
  query: string;
  paging: Paging;
  results: Item[];
  secondary_results: Item[];
  related_results: Item[];
  sort: Sort;
  available_sorts: Sort[];
  filters: Filter[];
  available_filters: Filter[];
}

export interface Paging {
  total: number;
  offset: number;
  limit: number;
  primary_results: number;
}

export interface Sort {
  id: string;
  name: string;
}

export interface Filter {
  id: string;
  name: string;
  type: string;
  values: FilterValue[];
}

export interface FilterValue {
  id: string;
  name: string;
  results: number;
}

// ============================================
// LOCALIZAÇÃO
// ============================================

export interface Country {
  id: string;
  name: string;
  locale: string;
  currency_id: string;
}

export interface State {
  id: string;
  name: string;
}

export interface City {
  id: string;
  name: string;
}

export interface Neighborhood {
  id: string;
  name: string;
}

export interface Municipality {
  id: string;
  name: string;
}

export interface Location {
  address_line: string;
  zip_code: string;
  city: City;
  state: State;
  country: Country;
  latitude: string;
  longitude: string;
  no_number?: string;
  number?: string;
  apartment?: string;
  floor?: string;
  street_name?: string;
  street_number?: string;
}

export interface Geolocation {
  latitude: string;
  longitude: string;
}

export interface CoverageArea {
  type: string;
  coordinates: any[];
}

export interface ZipCodeResult {
  zip_code: string;
  neighborhood: Neighborhood;
  city: City;
  state: State;
  country: Country;
}

// ============================================
// MOEDAS
// ============================================

export interface Currency {
  id: string;
  symbol: string;
  description: string;
  decimal_places: number;
  decimal_separator: string;
  thousands_separator: string;
}

export interface CurrencyConversion {
  from: string;
  to: string;
  ratio: number;
  rate: number;
  inverse_rate: number;
  inverse_ratio: number;
}

// ============================================
// FAVORITOS
// ============================================

export interface Favorite {
  id: number;
  user_id: number;
  item_id: string;
  date_created: string;
}

export interface FavoriteSearchResult {
  favorites: Favorite[];
  paging: Paging;
}

// ============================================
// VARIAÇÕES
// ============================================

export interface Variation {
  id: number;
  item_id: string;
  price: number;
  original_price?: number;
  currency_id: string;
  quantity: number;
  sold_quantity: number;
  available_quantity: number;
  attribute_combinations: Attribute[];
  attributes: Attribute[];
  picture_ids: string[];
  picture?: Picture;
  created_date: string;
  last_updated: string;
}

export interface VariationSearchResult {
  variations: Variation[];
  paging: Paging;
}

// ============================================
// CATÁLOGO
// ============================================

export interface CatalogProduct {
  id: string;
  name: string;
  domain: string;
  attributes: Attribute[];
  pictures: Picture[];
  variations?: CatalogVariation[];
}

export interface CatalogVariation {
  id: string;
  attributes: Attribute[];
  picture_ids: string[];
}

export interface CatalogSearchResult {
  products: CatalogProduct[];
  paging: Paging;
}

export interface CatalogSuggestion {
  id: string;
  name: string;
  domain: string;
  status: string;
  catalog_product_id?: string;
  variations: CatalogVariation[];
}

// ============================================
// PRECIFICAÇÃO
// ============================================

export interface PriceSuggestion {
  item_id: string;
  suggested_price: number;
  currency_id: string;
  reason: string;
}

export interface Price {
  price: number;
  original_price?: number;
  type: string;
  currency_id: string;
  exchange_rate?: number;
  amount: number;
  regular_amount?: number;
}

export interface PriceConfig {
  pricing_central: string;
  price_display: string;
}

export interface PricingRule {
  id: string;
  name: string;
  type: string;
  conditions: PricingCondition[];
  actions: PricingAction[];
  status: string;
}

export interface PricingCondition {
  type: string;
  parameters: Record<string, any>;
}

export interface PricingAction {
  type: string;
  value: number;
}

// ============================================
// FLEX E FULFILLMENT
// ============================================

export interface FlexSubscription {
  id: number;
  user_id: number;
  service_id: number;
  status: string;
  coverage_zones: CoverageZone[];
  holidays: Holiday[];
}

export interface CoverageZone {
  id: number;
  name: string;
  coordinates: any[];
}

export interface Holiday {
  id: number;
  date: string;
  description: string;
}

export interface FulfillmentInventory {
  inventory_id: string;
  items: FulfillmentItem[];
  total_quantity: number;
}

export interface FulfillmentItem {
  item_id: string;
  variation_id: number;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
}

// ============================================
// TENDÊNCIAS
// ============================================

export interface Trend {
  id: string;
  name: string;
  category_id: string;
  url: string;
  volume: number;
  trend_direction: string;
}

export interface TrendSearchResult {
  trends: Trend[];
  paging: Paging;
}

// ============================================
// REPUTAÇÃO
// ============================================

export interface SellerReputation {
  level_id: string;
  power_seller_status: string;
  transactions: TransactionReputation;
  metrics: ReputationMetrics;
}

export interface TransactionReputation {
  total: number;
  completed: number;
  cancelled: number;
  unrated: number;
}

export interface ReputationMetrics {
  cancellations: CancellationMetrics;
  claims: ClaimMetrics;
  delayed_handling_time: DelayMetrics;
}

export interface CancellationMetrics {
  rate: number;
  value: number;
}

export interface ClaimMetrics {
  rate: number;
  value: number;
}

export interface DelayMetrics {
  rate: number;
  value: number;
}

export interface ProductReview {
  id: string;
  product_id: string;
  rating: number;
  title: string;
  content: string;
  reviewer: string;
  date_created: string;
  status: string;
}

// ============================================
// VISITAS
// ============================================

export interface Visit {
  item_id: string;
  visits: number;
  buyers: number;
  date: string;
}

export interface VisitSummary {
  user_id: number;
  total_visits: number;
  total_buyers: number;
  visits_by_date: Visit[];
}

export interface VisitTimeWindow {
  last: number;
  unit: string;
  ending: string;
  data: Visit[][];
}

// ============================================
// TIPOS GERAIS
// ============================================

export interface Phone {
  area_code: string;
  number: string;
  extension?: string;
  verified?: boolean;
}

export interface Address {
  id: number;
  address_line: string;
  zip_code: string;
  city: City;
  state: State;
  country: Country;
  latitude: string;
  longitude: string;
}

export interface Identification {
  type: string;
  number: string;
}

export interface BillingInfo {
  doc_type: string;
  doc_number: string;
}

export interface SellerInfo {
  real_estate_agency: boolean;
  car_dealer: boolean;
  temporal_range: string;
  point_of_sale: string;
}

export interface UserStatus {
  site_status: string;
  confirmed_email: boolean;
  buyer?: UserBuyerStatus;
  seller?: UserSellerStatus;
}

export interface UserBuyerStatus {
  tags: string[];
  programs: string[];
  credit: UserCredit;
}

export interface UserCredit {
  loan_quota: number;
  consolidated: boolean;
  rank: string;
  level: string;
}

export interface UserSellerStatus {
  tags: string[];
  programs: string[];
  power_seller_status: string;
  qualified_registration: boolean;
}

export interface Company {
  id: number;
  name: string;
  trade_name?: string;
  logo?: string;
}

export interface Picture {
  id: string;
  url: string;
  secure_url: string;
  size: string;
  max_size: string;
  quality: string;
}

export interface Description {
  id: string;
}

export interface NonMercadoPagoPayment {
  type: string;
  id: string;
}

export interface Shipping {
  mode: string;
  methods: ShippingMethod[];
  tags: string[];
  dimensions?: Dimensions;
  local_pick_up: boolean;
  free_shipping: boolean;
  logistic_type: string;
  store_pick_up: boolean;
}

export interface ShippingMethod {
  id: number;
  name: string;
  type: string;
  rules: ShippingRule[];
}

export interface ShippingRule {
  default: boolean;
  free: boolean;
  free_methods: number[];
  max_height: number;
  max_width: number;
  max_length: number;
  max_weight: number;
}

export interface SellerAddress {
  id: number;
  address_line: string;
  city: City;
  state: State;
  country: Country;
  latitude: string;
  longitude: string;
  zip_code: string;
  street_name?: string;
  street_number?: string;
}

export interface Warning {
  code: string;
  message: string;
  parameter: string;
}

export interface DifferentialPricing {
  id: number;
}

export interface RelatedOrder {
  id: number;
  status: string;
  type: string;
}

export interface Mediation {
  id: number;
  status: string;
}

export interface Pickup {
  id: number;
  type: string;
  status: string;
  date?: string;
  hour?: string;
  address: ShippingAddress;
}

export interface OrderRequest {
  return: boolean;
  change?: boolean;
}

export interface OrderContext {
  channel: string;
}

// ============================================
// TIPOS DE INPUT
// ============================================

export interface CreateItemInput {
  title: string;
  category_id: string;
  price: number;
  currency_id: string;
  available_quantity: number;
  buying_mode: string;
  listing_type_id: string;
  condition?: ItemCondition;
  description?: string;
  pictures?: PictureInput[];
  video_id?: string;
  attributes?: AttributeInput[];
  variations?: VariationInput[];
  shipping?: ShippingInput;
  seller_address?: SellerAddressInput;
  seller_contact?: string;
  location?: LocationInput;
  tags?: string[];
  lot_quantity?: number;
  warranty?: string;
  domain_id?: string;
}

export interface PictureInput {
  source: string;
}

export interface AttributeInput {
  id: string;
  value_name: string;
  value_id?: string;
}

export interface VariationInput {
  price: number;
  original_price?: number;
  currency_id: string;
  available_quantity: number;
  attribute_combinations: AttributeInput[];
  attributes?: AttributeInput[];
  picture_ids?: string[];
}

export interface ShippingInput {
  mode: string;
  local_pick_up?: boolean;
  free_shipping?: boolean;
  free_methods?: number[];
  dimensions?: Dimensions;
  logistic_type?: string;
  store_pick_up?: boolean;
}

export interface SellerAddressInput {
  address_line: string;
  zip_code: string;
  city: City;
  state: State;
  country: Country;
  latitude?: string;
  longitude?: string;
  street_name?: string;
  street_number?: string;
}

export interface LocationInput {
  address_line: string;
  zip_code: string;
  city: City;
  state: State;
  country: Country;
  latitude: string;
  longitude: string;
}

export interface UpdateItemInput {
  title?: string;
  price?: number;
  available_quantity?: number;
  condition?: ItemCondition;
  pictures?: PictureInput[];
  variations?: VariationInput[];
  shipping?: ShippingInput;
  attributes?: AttributeInput[];
}

// ============================================
// NOTIFICAÇÕES
// ============================================

export interface Notification {
  id: number;
  user_id: number;
  resource: string;
  topic: string;
  received: string;
  sent: string;
  payload: any;
}

export interface NotificationSearchResult {
  notifications: Notification[];
  paging: Paging;
}
