// exports.handler = async event => {

// };
const Responses = require('./API_Responses');

const axios = require('axios');
const apiKey = 'fa9451f43414ff45a8b35f81737326b8';
exports.handler = async event => {
    console.log('event', event);

    if (!event.pathParameters || !event.pathParameters.CITY) {
        // failed without an CITY
        return Responses._400({ message: 'missing the CITY from the path' });
    }

    let CITY = event.pathParameters.CITY;

    if (!!event.pathParameters.CITY) {
        // return the data
        return Responses._200(data[CITY]);
    }


    //failed as CITY not in the data
    return Responses._400({ message: 'no CITY in data' });
};