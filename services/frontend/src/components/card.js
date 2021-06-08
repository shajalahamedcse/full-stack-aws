import React from 'react';
export default (props) => {
    const {country, city, temp, temp_max, temp_min, humidity, description} = props;
    return (
        <div className="card">
            <div className="card-header">
                {country}
            </div>
            <ul className="list-group list-group-flush">
                <li className="list-group-item"><b>City:</b> {city}</li>
                <li className="list-group-item"><b>Type:</b> {description}</li>
                <li className="list-group-item"><b>Max Temperature:</b> {temp_max}</li>
                <li className="list-group-item"><b>Min Temperature:</b> {temp_min}</li>
                <li className="list-group-item"><b>Humidity:</b> {humidity}</li>
            </ul>
        </div>
    );
}