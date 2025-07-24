require('dotenv').config();
const mongoose = require('mongoose');
const Badge = require('../models/Badge');
const WasteType = require('../models/WasteType');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected for seeding');
  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
};

const seedBadges = async () => {
  try {
    await Badge.deleteMany({});
    
    const badges = [
      {
        name: 'First Steps',
        description: 'Submit your first waste report',
        icon: '🌱',
        criteria: { type: 'report_count', value: 1 },
        rarity: 'Common',
        points: 5
      },
      {
        name: 'Eco Warrior',
        description: 'Submit 10 waste reports',
        icon: '⚔️',
        criteria: { type: 'report_count', value: 10 },
        rarity: 'Common',
        points: 25
      },
      {
        name: 'Environmental Guardian',
        description: 'Submit 25 waste reports',
        icon: '🛡️',
        criteria: { type: 'report_count', value: 25 },
        rarity: 'Rare',
        points: 50
      },
      {
        name: 'Planet Protector',
        description: 'Submit 50 waste reports',
        icon: '🌍',
        criteria: { type: 'report_count', value: 50 },
        rarity: 'Epic',
        points: 100
      },
      {
        name: 'Legend',
        description: 'Submit 100 waste reports',
        icon: '👑',
        criteria: { type: 'report_count', value: 100 },
        rarity: 'Legendary',
        points: 250
      },
      {
        name: 'Sharp Eye',
        description: 'Achieve 80% accuracy in waste detection',
        icon: '👁️',
        criteria: { type: 'accuracy', value: 80 },
        rarity: 'Rare',
        points: 75
      },
      {
        name: 'Eagle Vision',
        description: 'Achieve 90% accuracy in waste detection',
        icon: '🦅',
        criteria: { type: 'accuracy', value: 90 },
        rarity: 'Epic',
        points: 150
      },
      {
        name: 'Streak Master',
        description: 'Report waste for 7 consecutive days',
        icon: '🔥',
        criteria: { type: 'streak', value: 7 },
        rarity: 'Rare',
        points: 60
      },
      {
        name: 'Dedication',
        description: 'Report waste for 30 consecutive days',
        icon: '💪',
        criteria: { type: 'streak', value: 30 },
        rarity: 'Epic',
        points: 200
      },
      {
        name: 'Unstoppable',
        description: 'Report waste for 100 consecutive days',
        icon: '🚀',
        criteria: { type: 'streak', value: 100 },
        rarity: 'Legendary',
        points: 500
      }
    ];

    await Badge.insertMany(badges);
    console.log('Badges seeded successfully');
  } catch (error) {
    console.error('Error seeding badges:', error);
  }
};

const seedWasteTypes = async () => {
  try {
    await WasteType.deleteMany({});
    
    const wasteTypes = [
      {
        name: 'Plastic',
        description: 'Plastic bottles, bags, containers, and other plastic waste',
        riskLevel: 'Medium',
        color: '#3B82F6',
        icon: '🥤',
        handlingInstructions: 'Separate by type, clean containers, and recycle where possible. Avoid burning plastic.',
        environmentalImpact: 'Takes 450-1000 years to decompose. Releases microplastics that harm marine life and enter food chain.'
      },
      {
        name: 'Chemical',
        description: 'Chemical containers, batteries, paint, and hazardous substances',
        riskLevel: 'Critical',
        color: '#EF4444',
        icon: '☢️',
        handlingInstructions: 'Do not touch directly. Contact local hazardous waste disposal facility immediately.',
        environmentalImpact: 'Can contaminate soil and groundwater for decades. Toxic to humans, animals, and plants.'
      },
      {
        name: 'Oil',
        description: 'Motor oil, cooking oil, petroleum products, and oil spills',
        riskLevel: 'High',
        color: '#F59E0B',
        icon: '🛢️',
        handlingInstructions: 'Contain spill with absorbent materials. Do not wash into drains. Contact environmental authorities.',
        environmentalImpact: 'One liter of oil can contaminate up to one million liters of water. Harmful to aquatic ecosystems.'
      },
      {
        name: 'Mixed Waste',
        description: 'Combination of different waste types or unidentifiable waste',
        riskLevel: 'Medium',
        color: '#8B5CF6',
        icon: '🗑️',
        handlingInstructions: 'Separate different materials if possible. Follow local waste management guidelines.',
        environmentalImpact: 'Impact varies by composition. Proper sorting and disposal reduces environmental harm.'
      }
    ];

    await WasteType.insertMany(wasteTypes);
    console.log('Waste types seeded successfully');
  } catch (error) {
    console.error('Error seeding waste types:', error);
  }
};

const seedData = async () => {
  await connectDB();
  await seedBadges();
  await seedWasteTypes();
  console.log('Database seeding completed');
  process.exit(0);
};

seedData();

