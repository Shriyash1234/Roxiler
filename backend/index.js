const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
app.use(cors({}));
const dbName = "Roxiler";
mongoose
  .connect(process.env.url, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    dbName: dbName,
  })
  .then(() => {
    console.log("Database connected");
  })
  .catch((error) => {
    console.log(error);
  });

// Define the schema
const productSchema = new mongoose.Schema({
  id: Number,
  title: String,
  price: Number,
  description: String,
  category: String,
  image: String,
  sold: Boolean,
  dateOfSale: Date,
});

// Create the model
const Product = mongoose.model('Product', productSchema);

// API endpoint for initializing the database
app.get('/api/initialize-database', async (req, res) => {
  try {
    const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
    const productsData = response.data;
    await Product.insertMany(productsData);

    res.status(200).json({ success: true, message: 'Database initialized successfully' });
  } catch (error) {
    console.error('Error initializing database:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});
app.get('/transactions/all', async (req, res) => {
  try {
    let query = {};
    const transactions = await Product.find(query)
    res.status(200).json({ success: true, transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});
app.get('/transactions', async (req, res) => {
  const { page = 1, perPage = 10, title, description, price,saleMonth } = req.query;

  try {
    let query = {};

    if (title) {
      query.title = { $regex: title, $options: 'i' };
    }
    if (description) {
      query.description = { $regex: description, $options: 'i' };
    }
    if (price) {
      query.price = { $eq: parseFloat(price) };
    }
    if (saleMonth) {
      const startOfMonth = new Date(`${saleMonth}-01T00:00:00.000Z`);
      const endOfMonth = new Date(new Date(startOfMonth).setMonth(startOfMonth.getMonth() + 1));
      query.dateOfSale = { $gte: startOfMonth, $lt: endOfMonth };
    }
    const transactions = await Product.find(query)
      .skip((page - 1) * perPage)
      .limit(parseInt(perPage));

    res.status(200).json({ success: true, transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.get('/statistics', async (req, res) => {
    const { saleMonth } = req.query;
  
    try {
      const query = {};
  
      if (saleMonth) {
        const startOfMonth = new Date(`${saleMonth}-01T00:00:00.000Z`);
        const endOfMonth = new Date(new Date(startOfMonth).setMonth(startOfMonth.getMonth() + 1));
        query.dateOfSale = { $gte: startOfMonth, $lt: endOfMonth };
      }
  
      const statistics = await Product.find(query)
      const soldItems = [];
      const unsoldItems = [];
      var totalSale = 0;
      for(const item of statistics){
        if(item.sold){
            soldItems.push(item);
            totalSale += parseFloat(item.price);
        }
        else{
            unsoldItems.push(item);
        }
      }
      const responseJSON = {
        success: true,
        statistics: {
          soldItems,
          unsoldItems,
          totalSale,
        },
      };
      res.status(200).json(responseJSON);
    } catch (error) {
      console.error('Error fetching statistics', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  app.get('/bar-chart', async (req, res) => {
    const { saleMonth } = req.query;
  
    try {
      const query = {};
  
      if (saleMonth) {
        const startOfMonth = new Date(`${saleMonth}-01T00:00:00.000Z`);
        const endOfMonth = new Date(new Date(startOfMonth).setMonth(startOfMonth.getMonth() + 1));
        query.dateOfSale = { $gte: startOfMonth, $lt: endOfMonth };
      }
  
      const statistics = await Product.find(query);

      const priceRangesCount = {
        '0-100': 0,
        '101-200': 0,
        '201-300': 0,
        '301-400': 0,
        '401-500': 0,
        '501-600': 0,
        '601-700': 0,
        '701-800': 0,
        '801-900': 0,
        '901-above': 0,
      };
  
      for (const item of statistics) {
        const price = parseFloat(item.price);
  
        if (price >= 0 && price <= 100) {
          priceRangesCount['0-100']++;
        } else if (price <= 200) {
          priceRangesCount['101-200']++;
        } else if (price <= 300) {
          priceRangesCount['201-300']++;
        } else if (price <= 400) {
          priceRangesCount['301-400']++;
        } else if (price <= 500) {
          priceRangesCount['401-500']++;
        } else if (price <= 600) {
          priceRangesCount['501-600']++;
        } else if (price <= 700) {
          priceRangesCount['601-700']++;
        } else if (price <= 800) {
          priceRangesCount['701-800']++;
        } else if (price <= 900) {
          priceRangesCount['801-900']++;
        } else {
          priceRangesCount['901-above']++;
        }
      }
  
      res.status(200).json({ success: true, priceRangesCount });
    } catch (error) {
      console.error('Error fetching bar chart data', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });
  app.get('/pie-chart', async (req, res) => {
    const { saleMonth } = req.query;
  
    try {
      const query = {};
  
      if (saleMonth) {
        const startOfMonth = new Date(`${saleMonth}-01T00:00:00.000Z`);
        const endOfMonth = new Date(new Date(startOfMonth).setMonth(startOfMonth.getMonth() + 1));
        query.dateOfSale = { $gte: startOfMonth, $lt: endOfMonth };
      }
  
      const statistics = await Product.find(query);
  
      const categoryCounts = new Map();
  
      for (const item of statistics) {
        const category = item.category;
  
        if (category) {
          categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
        }
      }

      const categoryCountsObject = {};
      categoryCounts.forEach((count, category) => {
        categoryCountsObject[category] = count;
      });
  
      res.status(200).json({ success: true, categoryCounts: categoryCountsObject });
    } catch (error) {
      console.error('Error fetching pie chart data', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });
  
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
