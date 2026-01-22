// Script to check and fix kametis that should be closed
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Kameti = require('../models/Kameti');

async function fixClosedKametis() {
  try {
    // Connect to MongoDB - use same connection string as server.js
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found in environment variables');
      process.exit(1);
    }
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find all kametis
    const kametis = await Kameti.find({});
    console.log(`\n🔍 Found ${kametis.length} kametis to check\n`);

    let fixedCount = 0;
    let alreadyClosedCount = 0;
    let needsFixCount = 0;

    for (const kameti of kametis) {
      // Check if all members received payout
      const allMembersReceivedPayout = kameti.members.length > 0 && 
        kameti.members.every(m => m.hasReceivedPayout === true);
      
      const shouldBeClosed = allMembersReceivedPayout || (kameti.currentRound > kameti.membersCount);

      console.log(`\n📋 Kameti: ${kameti.name} (${kameti.kametiId})`);
      console.log(`   Status: ${kameti.status}`);
      console.log(`   Current Round: ${kameti.currentRound} / ${kameti.membersCount}`);
      console.log(`   Members: ${kameti.members.length}`);
      console.log(`   All received payout: ${allMembersReceivedPayout}`);
      console.log(`   Members status:`, kameti.members.map(m => ({
        email: m.email,
        hasReceivedPayout: m.hasReceivedPayout,
        payoutRound: m.payoutRound
      })));

      if (shouldBeClosed && kameti.status !== 'Closed') {
        console.log(`   ⚠️  SHOULD BE CLOSED BUT STATUS IS: ${kameti.status}`);
        needsFixCount++;
        
        // Fix it
        kameti.status = 'Closed';
        kameti.round = `Closed (${kameti.membersCount} of ${kameti.membersCount})`;
        kameti.currentRound = kameti.membersCount;
        await kameti.save();
        console.log(`   ✅ FIXED: Status set to Closed`);
        fixedCount++;
      } else if (kameti.status === 'Closed') {
        console.log(`   ✅ Already closed`);
        alreadyClosedCount++;
      } else {
        console.log(`   ℹ️  Not ready to close yet`);
      }
    }

    console.log(`\n\n📊 Summary:`);
    console.log(`   Total kametis: ${kametis.length}`);
    console.log(`   Already closed: ${alreadyClosedCount}`);
    console.log(`   Fixed (set to closed): ${fixedCount}`);
    console.log(`   Needs fix: ${needsFixCount}`);
    console.log(`   Not ready: ${kametis.length - alreadyClosedCount - fixedCount - needsFixCount}`);

    await mongoose.disconnect();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixClosedKametis();

