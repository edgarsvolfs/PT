const express = require('express');
const app = express();

// Middleware to parse incoming JSON data
app.use(express.json());

const axios = require('axios');

app.use((req, res, next) => {
  const startTime = Date.now();

  // Log incoming request
  const incomingLog = {
    type: 'messageIn',
    body: req.body,
    method: req.method,
    path: req.url,
    dateTime: new Date().toISOString(),
  };
  console.log(JSON.stringify(incomingLog));

  // Continue with the request handling
  next();
});



app.post('/', async (req, res) => {

  const { query, page } = req.body;

  if (typeof query !== 'string' || query.length < 1) {
    const errorResponse = { code: 400, message: 'Invalid or missing query parameter.' };
    return res.status(400).json(errorResponse);
  }

  if (isNaN(page) || page < 0) {
    const errorResponse = { code: 400, message: 'Invalid or missing page parameter.'};
    return res.status(400).json(errorResponse);
  }

    try {
        // Construct the API URL using the query and page values
      const apiUrl = `https://dummyjson.com/products/search?q=${query}&limit=2&skip=${page}`; 
      //const apiUrl = `https://dummyjson.com/products/wrongEndpoint?q=${query}&limit=2&skip=${page}`;
      const response = await axios.get(apiUrl);
      const products = response.data.products;

      //console.log(products);

      // Transform the data, e.g., add final_price field
      const transformedProducts = products.map(product => ({
        title: product.title,
        description: product.description,
        final_price: parseFloat((product.price / product.discountPercentage * 100).toFixed(2)),
      }));
  
      // Log only the relevant information to avoid circular references

      //console.log('Transformed Products:', transformedProducts);
  
      // Send the transformed data as the response 
      res.json(transformedProducts); 
    } catch (error) {
      res.locals.error = error; // for js middleware outgoing message
      //console.error('Error fetching data from the API:', error.message);
      res.status(error.response.status).json({ code: error.response.status, message: error.stack }); //res.status(500).json({ code: 500, message: error.stack });
    } finally {
      // Log outgoing message
      const outgoingLog = {
        type: 'messageOut',
        body: res.locals.body,
        dateTime: new Date().toISOString(),
        fault: res.locals.error ? res.locals.error.stack : null, // Set fault to error stack if there's an error
      };
      console.log(JSON.stringify(outgoingLog, null, 2));
    }
  });

// Start the server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});