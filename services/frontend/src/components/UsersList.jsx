import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import axios from "axios";

const UsersList = (props) => {
  const [temp, setTemp] = useState("");
  const header = "2a9b98f78b48a85eedc552fc60435a49";
  const url = `https://api.openweathermap.org/data/2.5/weather?q=Melbourne&appid=${header}`;
  useEffect(() => {
    axios
      .get(url)
      .then((res) => {
        // console.log(res.data.main.temp - 273);
        setTemp(res.data.main.temp - 273);
      })
      .catch(() => {
        console.log("->");
      });
  }, []);
  return (
    <div>
      <table className="table is-hoverable is-fullwidth">
        <thead>
          <tr>
            <th>ID</th>
            <th>Email</th>
            <th>Username</th>
            {props.isAuthenticated() && <th />}
          </tr>
        </thead>
        <tbody>
          {props.users.map((user) => {
            return (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.email}</td>
                <td className="username">{user.username}</td>
                {props.isAuthenticated() && (
                  <td>
                    <button
                      className="button is-danger is-small"
                      onClick={() => props.removeUser(user.id)}
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
          <tr>
            <td>Temperature</td>
            <td>{temp}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

UsersList.propTypes = {
  users: PropTypes.array.isRequired,
  removeUser: PropTypes.func.isRequired,
  isAuthenticated: PropTypes.func.isRequired,
};

export default UsersList;
