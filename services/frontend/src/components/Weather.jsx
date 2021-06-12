import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import axios from "axios";

import Card from "./card";
const Weather = (props) => {
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const calculation = (data)=>{
    console.log(data.main.temp_max-273.15)
    const temp1 = (data.main.temp_max-273.15).toFixed(2);;
    console.log(temp1);
    // console.log(data);
    return data;
  }
  const updateHandler = async () => {
    const url = `https://0nz0pzyudj.execute-api.ap-southeast-2.amazonaws.com/dev/weatherdata/${input}`;
    // const url = `https://api.openweathermap.org/data/2.5/weather?q=${input}&appid=fa9451f43414ff45a8b35f81737326b8`;
    console.log("changed");
    console.log(input);
    if (!!input) {
      try {
        const res = await axios.get(url);
        console.log(res);
        if (res.status === 200) {
          const data = calculation(res.data);
          // setResult(res.data);
          setResult(data);
        }
      } catch (error) {
        console.log(error);
      }
    } else {
      setResult("");
    }
  };
  return (
    <div>
      {!!props.isAuthenticated() && (
        <div>
          <input
            className="form-control"
            value={input}
            placeholder="Type city name"
            onChange={(e) => {
              setInput(e.target.value);
              updateHandler();
            }}
          />
          {/* {url(input)} */}
          {!!result && !!input && (
            <Card
              country={result.sys.country}
              city={result.name}
              temp={(result.main.temp-273.15).toFixed(2)}
              temp_max={(result.main.temp_max-273.15).toFixed(2)+ " °C"} 
              temp_min={(result.main.temp_min-273.15).toFixed(2)+ " °C"} 
              humidity={result.main.humidity}
              description={result.weather[0].description}
            />
          )}
        </div>
      )}
      {/* <Card/> */}
    </div>
  );
};

Weather.propTypes = {
  isAuthenticated: PropTypes.func.isRequired,
};

export default Weather;
