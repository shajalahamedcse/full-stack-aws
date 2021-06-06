const axios = require('axios');
const header = '2a9b98f78b48a85eedc552fc60435a49';
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