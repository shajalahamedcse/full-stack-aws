import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import axios from "axios";

import Card from "./card";
const Weather = (props) => {
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const updateHandler = async () => {
    const url = `https://0nz0pzyudj.execute-api.ap-southeast-2.amazonaws.com/dev/weatherdata/${input}`;
    console.log("changed");
    if (!!input) {
      try {
        const res = await axios.get(url);
        if (res.status === 200) {
          console.log(res);
          setResult(res.data);
        }
      } catch (error) {
        console.log("err");
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
              temp={result.main.temp}
              temp_max={result.main.temp_max}
              temp_min={result.main.temp_min}
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
