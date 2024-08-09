exports.handler = async (event) => {
  if (event.httpMethod === 'POST') {
    console.log('CSP Report:', JSON.parse(event.body));
    return {
      statusCode: 204, // No content
      body: '',
    };
  } else {
    return {
      statusCode: 405, // Method Not Allowed
      body: 'Method Not Allowed',
    };
  }
};
