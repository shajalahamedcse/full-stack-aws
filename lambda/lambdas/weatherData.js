const Responses = require('./API_Responses');
const axios = require('axios');

exports.handler = async event => {
    console.log('event', event);
    
    if (!event.pathParameters || !event.pathParameters.ID) {
        // failed without an ID
        return Responses._400({ message: 'missing the ID from the path' });
    }
    
    let ID = event.pathParameters.ID;
    
    if (!!ID) {
        const header = 'fa9451f43414ff45a8b35f81737326b8';
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${ID}&appid=${header}`;
        const res = await axios.get(url)
        return Responses._200(res.data)
    }
};
// handler()