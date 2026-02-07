const { MercadoLibreSDK } = require("/app/sdk/complete-sdk");
const mongoose = require("mongoose");

async function testSDK() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      "mongodb://admin:changeme@mongo:27017/projeto-sass?authSource=admin",
    );
    console.log("✓ Connected to MongoDB");

    // Get account from DB
    const MLAccount = require("/app/db/models/MLAccount");
    const account = await MLAccount.findOne({
      id: "ml_1770228546600_b817615ca816",
    });

    if (!account) {
      console.error("✗ Account not found");
      process.exit(1);
    }

    console.log("✓ Account found:", {
      id: account.id,
      mlUserId: account.mlUserId,
      nickname: account.nickname,
      hasToken: !!account.accessToken,
      tokenLength: account.accessToken?.length,
      tokenType: typeof account.accessToken,
      tokenValue: account.accessToken,
    });

    // Test SDK with positional parameters (like SDK Manager does)
    console.log("\n--- Testing SDK with positional parameters ---");
    console.log("Creating SDK with:", {
      accessToken: account.accessToken,
      refreshToken: account.refreshToken,
      accessTokenType: typeof account.accessToken,
    });
    const sdk1 = new MercadoLibreSDK(account.accessToken, account.refreshToken);
    console.log("SDK created:", {
      hasMLAuth: !!sdk1.mlAuth,
      mlAuthToken: sdk1.mlAuth?.accessToken?.substring(0, 20) + "...",
      hasMLHttp: !!sdk1.mlHttp,
      httpHasAuth: !!sdk1.mlHttp?.auth,
      httpAuthToken: sdk1.mlHttp?.auth?.accessToken?.substring(0, 20) + "...",
    });

    // Test API call
    console.log("\n--- Testing getItemsByUser API call ---");
    const result = await sdk1.items.getItemsByUser(account.mlUserId, {
      limit: 10,
    });
    console.log("Result:", {
      status: result.status,
      hasData: !!result.data,
      dataKeys: Object.keys(result.data || {}),
      resultsCount: result.data?.results?.length || 0,
      firstThreeIds: result.data?.results?.slice(0, 3),
    });

    if (result.data?.results?.length > 0) {
      console.log("\n✓ SUCCESS! Items returned:", result.data.results.length);
    } else {
      console.log("\n✗ FAILED! No items returned");
      console.log("Full response:", JSON.stringify(result.data, null, 2));
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("\n✗ ERROR:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

testSDK();
