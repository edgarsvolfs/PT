const express = require('express');
const formidable = require('formidable');
const xml2js = require('xml2js');
const app = express();

app.use(express.json());
const axios = require('axios');

const logIncomingRequest = (requestData) => {
  const incomingLog = {
    type: 'messageIn',
    body: requestData,
    method: 'POST', // or any other default method if needed
    path: '/', // or any other default path if needed
    dateTime: new Date().toISOString(),
  };
  console.log(JSON.stringify(incomingLog));
};

app.use((req, res, next) => {
  const contentType = req.get('Content-Type');

  if (contentType === 'application/xml') {
    let xmlData = '';

    req.on('data', (chunk) => {
      xmlData += chunk.toString();
    });

    req.on('end', () => {
      // Parse XML data to JSON
      xml2js.parseString(xmlData, (err, result) => {
        if (err) {
          return res.status(400).json({ error: 'Error parsing XML data' });
        }
        const modifiedResult = {
          query: result.query,
          page: Number(result.page)
        };
        
        const resultToString = JSON.stringify(result.request);
        const modifiedResultToString = resultToString.replace(/[\[\]']+/g, ''); // xml12js converts it to json with [] brackets, this removes it
        const endResult = JSON.parse(modifiedResultToString);
        req.body = endResult;
        logIncomingRequest(req.body);
        next();
      });
    });
  } 
  // else if (contentType === 'multipart/form-data') {
    
  //   const form = new formidable.IncomingForm();
  //   //console.log('form', form);
    
  //   form.parse(req, (err, fields, files) => {
  //     console.log('fields', fields);
  //     if (err) {
  //       return res.status(400).json({ error: err });
  //     }

  //     // Convert form data to JSON
  //     req.body = fields;
  //     logIncomingRequest(req.body);  
  //     next();
  //   });
  //}
   else {
    logIncomingRequest(req.body);
    next();
}
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
      
      const apiUrl = `https://dummyjson.com/products/search?q=${query}&limit=2&skip=${page}`;
      //const apiUrl = `https://dummyjson.com/products/wrongEndpoint?q=${query}&limit=2&skip=${page}`; // for error testing
      const response = await axios.get(apiUrl);
      const products = response.data.products;

      // Transform the data, e.g., add final_price field
      const transformedData = products.map(product => ({
        title: product.title,
        description: product.description,
        final_price: parseFloat((product.price / product.discountPercentage * 100).toFixed(2)),
      }));
  
      // Send the transformed data as the response 
      res.json(transformedData); 
      
    } catch (error) {

      res.locals.error = error; // for js middleware outgoing message
      res.status(error.response.status).json({ code: error.response.status, message: error.stack }); 

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