import React from 'react';
import { useNavigate, Link } from "react-router-dom";

import { useSnapshot } from 'valtio'
import state from "../context/global"

const Home = () => {

     let navigate = useNavigate();
    const snap = useSnapshot(state)

    return (
        <div>
            <p>'sup</p>
            <Link to="/">Go Back</Link>
            <button onClick={() => state.count++}>
                Valtio count is {snap.count}
            </button>
            <button onClick={(event) => {
            event.preventDefault();
            navigate(`/`);
            }}>Go</button>
        </div>
    );
};

export default Home;