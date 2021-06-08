// exports.handler = async event => {

// };
const axios = require('axios');
const header = 'fa9451f43414ff45a8b35f81737326b8';
const url = `https://api.openweathermap.org/data/2.5/weather?q=Melbourne&appid=${header}`;
exports.handler = function(event, context, callback) {
    axios.get(url).then(res => {
        console.log(res.data)
        callback(null, {
            'statusCode': 200,
            'body': res.data,
        })
    }).catch(() => {
        console.log("->")
    });
};