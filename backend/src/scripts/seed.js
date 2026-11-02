import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import {
  User, Vendor, Category, Product, ProductFile, Banner, BlogCategory, BlogPost, Setting, Template
} from '../models/index.js';

const MONGODB_URI = process.env.MONGODB_URI;

async function seed() {
  try {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Vendor.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      ProductFile.deleteMany({}),
      Banner.deleteMany({}),
      BlogCategory.deleteMany({}),
      BlogPost.deleteMany({}),
      Setting.deleteMany({}),
      Template.deleteMany({})
    ]);

    // Create admin user
    console.log('👤 Creating admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await User.create({
      email: 'admin@digitalmarket.com',
      password: hashedPassword,
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin',
      is_active: true,
      email_verified: true
    });
    console.log(`   ✅ Admin: admin@digitalmarket.com / admin123`);

    // Create vendor user
    console.log('👤 Creating vendor user...');
    const vendorPassword = await bcrypt.hash('vendor123', 10);
    const vendorUser = await User.create({
      email: 'vendor@digitalmarket.com',
      password: vendorPassword,
      first_name: 'Jean',
      last_name: 'Dupont',
      role: 'vendor',
      is_active: true,
      email_verified: true
    });

    const vendor = await Vendor.create({
      user_id: vendorUser._id,
      store_name: 'Digital Creations',
      store_slug: 'digital-creations',
      store_description: 'Spécialiste en templates et ressources numériques de haute qualité.',
      status: 'approved',
      rating: 4.8,
      total_sales: 0
    });
    console.log(`   ✅ Vendor: vendor@digitalmarket.com / vendor123`);

    // Create regular user
    console.log('👤 Creating regular user...');
    const userPassword = await bcrypt.hash('user123', 10);
    await User.create({
      email: 'user@digitalmarket.com',
      password: userPassword,
      first_name: 'Marie',
      last_name: 'Martin',
      role: 'client',
      is_active: true,
      email_verified: true
    });
    console.log(`   ✅ User: user@digitalmarket.com / user123`);

    // Create categories
    console.log('📁 Creating categories...');
    const categories = await Category.insertMany([
      { name: 'Templates Web', slug: 'templates-web', description: 'Templates HTML, CSS et JavaScript', icon: '🌐', is_active: true, sort_order: 1 },
      { name: 'Applications Mobile', slug: 'applications-mobile', description: 'Templates et UI kits pour iOS et Android', icon: '📱', is_active: true, sort_order: 2 },
      { name: 'Graphisme', slug: 'graphisme', description: 'Logos, icônes, illustrations', icon: '🎨', is_active: true, sort_order: 3 },
      { name: 'Documents', slug: 'documents', description: 'CV, présentations, documents professionnels', icon: '📄', is_active: true, sort_order: 4 },
      { name: 'Audio & Vidéo', slug: 'audio-video', description: 'Musique, effets sonores, vidéos', icon: '🎵', is_active: true, sort_order: 5 },
      { name: 'E-books', slug: 'e-books', description: 'Livres numériques et guides', icon: '📚', is_active: true, sort_order: 6 }
    ]);
    console.log(`   ✅ ${categories.length} categories created`);

    // Create subcategories
    const webCategory = categories[0];
    await Category.insertMany([
      { name: 'Landing Pages', slug: 'landing-pages', parent_id: webCategory._id, is_active: true, sort_order: 1 },
      { name: 'E-commerce', slug: 'e-commerce', parent_id: webCategory._id, is_active: true, sort_order: 2 },
      { name: 'Dashboards', slug: 'dashboards', parent_id: webCategory._id, is_active: true, sort_order: 3 }
    ]);

    // Create sample products
    console.log('📦 Creating sample products...');
    const products = await Product.insertMany([
      {
        vendor_id: vendor._id,
        category_id: categories[0]._id,
        name: 'Template Dashboard Pro',
        slug: 'template-dashboard-pro',
        description: 'Un dashboard moderne et responsive avec plus de 50 composants.',
        short_description: 'Dashboard admin moderne avec React et TailwindCSS',
        price: 25000,
        sale_price: 19000,
        thumbnail: 'https://placehold.co/600x400/3b82f6/white?text=Dashboard+Pro',
        status: 'published',
        is_featured: true,
        rating: 4.9,
        sales_count: 150
      },
      {
        vendor_id: vendor._id,
        category_id: categories[0]._id,
        name: 'Landing Page SaaS',
        slug: 'landing-page-saas',
        description: 'Template de landing page optimisé pour les produits SaaS.',
        short_description: 'Landing page moderne pour startups SaaS',
        price: 15000,
        thumbnail: 'https://placehold.co/600x400/10b981/white?text=SaaS+Landing',
        status: 'published',
        is_featured: true,
        rating: 4.7,
        sales_count: 89
      },
      {
        vendor_id: vendor._id,
        category_id: categories[2]._id,
        name: 'Pack Icons Premium',
        slug: 'pack-icons-premium',
        description: 'Plus de 1000 icônes vectorielles pour vos projets.',
        short_description: '1000+ icônes SVG professionnelles',
        price: 10000,
        sale_price: 7500,
        thumbnail: 'https://placehold.co/600x400/f59e0b/white?text=Icons+Pack',
        status: 'published',
        is_featured: false,
        rating: 4.5,
        sales_count: 200
      },
      {
        vendor_id: vendor._id,
        category_id: categories[3]._id,
        name: 'CV Professionnel',
        slug: 'cv-professionnel',
        description: 'Template de CV moderne et professionnel en format Word et PDF.',
        short_description: 'CV moderne avec design épuré',
        price: 5000,
        thumbnail: 'https://placehold.co/600x400/8b5cf6/white?text=CV+Pro',
        status: 'published',
        is_featured: false,
        rating: 4.6,
        sales_count: 320
      }
    ]);
    console.log(`   ✅ ${products.length} products created`);

    // Create templates
    console.log('📋 Creating templates...');
    await Template.insertMany([
      {
        vendor_id: vendor._id,
        name: 'Template Canva Business',
        slug: 'template-canva-business',
        description: 'Pack de 50 templates Canva pour votre business',
        thumbnail: 'https://placehold.co/600x400/ec4899/white?text=Canva+Pack',
        price: 15000,
        sale_price: 12000,
        type: 'canva',
        category: 'Business',
        status: 'published',
        is_featured: true,
        sales_count: 85
      },
      {
        vendor_id: vendor._id,
        name: 'Template Notion Productivité',
        slug: 'template-notion-productivite',
        description: 'Système complet de productivité pour Notion',
        thumbnail: 'https://placehold.co/600x400/000000/white?text=Notion+Pro',
        price: 10000,
        type: 'notion',
        category: 'Productivité',
        status: 'published',
        is_featured: true,
        sales_count: 120
      },
      {
        vendor_id: vendor._id,
        name: 'Présentation PowerPoint Pro',
        slug: 'presentation-powerpoint-pro',
        description: 'Template PowerPoint professionnel avec 100+ slides',
        thumbnail: 'https://placehold.co/600x400/c2410c/white?text=PowerPoint',
        price: 8000,
        sale_price: 6000,
        type: 'powerpoint',
        category: 'Présentation',
        status: 'published',
        is_featured: false,
        sales_count: 45
      }
    ]);
    console.log('   ✅ Templates created');

    // Create banners
    console.log('🎨 Creating banners...');
    await Banner.insertMany([
      {
        title: 'Bienvenue sur DigitalMarket',
        subtitle: 'La marketplace des créateurs numériques africains',
        image: 'https://placehold.co/1920x600/3b82f6/white?text=DigitalMarket',
        link: '/products',
        button_text: 'Explorer',
        position: 'home_hero',
        is_active: true,
        sort_order: 1
      },
      {
        title: 'Templates Premium',
        subtitle: 'Jusqu\'à 40% de réduction',
        image: 'https://placehold.co/1920x600/10b981/white?text=Promo+Templates',
        link: '/products?category=templates-web',
        button_text: 'Voir les offres',
        position: 'home_hero',
        is_active: true,
        sort_order: 2
      }
    ]);
    console.log('   ✅ Banners created');

    // Create blog categories
    console.log('📝 Creating blog categories...');
    const blogCategories = await BlogCategory.insertMany([
      { name: 'Tutoriels', slug: 'tutoriels', description: 'Guides et tutoriels', is_active: true },
      { name: 'Actualités', slug: 'actualites', description: 'Dernières nouvelles', is_active: true },
      { name: 'Design', slug: 'design', description: 'Tendances et conseils design', is_active: true }
    ]);

    // Create blog posts
    await BlogPost.insertMany([
      {
        author_id: admin._id,
        category_id: blogCategories[0]._id,
        title: 'Comment vendre sur DigitalMarket',
        slug: 'comment-vendre-sur-digitalmarket',
        excerpt: 'Guide complet pour démarrer votre activité de vendeur.',
        content: '<p>Découvrez comment créer votre boutique et vendre vos produits numériques...</p>',
        featured_image: 'https://placehold.co/800x400/3b82f6/white?text=Guide+Vendeur',
        status: 'published',
        is_featured: true,
        published_at: new Date()
      }
    ]);
    console.log('   ✅ Blog content created');

    // Create settings
    console.log('⚙️  Creating settings...');
    await Setting.insertMany([
      { setting_key: 'site_name', setting_value: 'DigitalMarket', setting_type: 'string' },
      { setting_key: 'commission_rate', setting_value: '10', setting_type: 'number' },
      { setting_key: 'withdrawal_fee_rate', setting_value: '10', setting_type: 'number' },
      { setting_key: 'min_withdrawal', setting_value: '5000', setting_type: 'number' },
      { setting_key: 'currency', setting_value: 'XOF', setting_type: 'string' },
      { setting_key: 'max_download_attempts', setting_value: '5', setting_type: 'number' }
    ]);
    console.log('   ✅ Settings created');

    console.log('\n🎉 Seed completed successfully!\n');
    console.log('═══════════════════════════════════════');
    console.log('  Test Accounts:');
    console.log('═══════════════════════════════════════');
    console.log('  Admin:  admin@digitalmarket.com / admin123');
    console.log('  Vendor: vendor@digitalmarket.com / vendor123');
    console.log('  User:   user@digitalmarket.com / user123');
    console.log('═══════════════════════════════════════\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();
