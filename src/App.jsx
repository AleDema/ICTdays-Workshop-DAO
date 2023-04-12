import { useEffect, useState, useRef } from 'react';
import './index.css';
import motokoLogo from './assets/motoko_moving.png';
import motokoShadowLogo from './assets/motoko_shadow.png';
import reactLogo from './assets/react.svg';
import RootLayout from './layouts/RootLayout';
import ErrorPage from './pages/ErrorPage';
import { idlFactory as daoFactory } from './declarations/DAO';
import { Principal } from '@dfinity/principal';

import {
  createRoutesFromElements, Link, createBrowserRouter,
  RouterProvider,
  Route
} from "react-router-dom";

function App() {
  const [principal, setPrincipal] = useState(null);
  const [daoCanister, setDaoCanister] = useState(null);
  const [isRegistered, setIsRegistered] = useState(null);
  const [proposals, setProposals] = useState([]);
  const canisterInputField = useRef(null);
  const proposalDescription = useRef(null);
  const proposalBody = useRef(null);

  const tryRegister = async () => {
    daoCanister.register(Principal.fromText(canisterInputField.current.value))
  }

  const submitProposal = async () => {
    daoCanister.submit_proposal(proposalDescription.current.value, proposalBody.current.value, { poll: null })
  }

  const vote = (id, vote) => {
    let choice = { reject: null }
    if (vote == "approve") choice = { approve: null }
    daoCanister.vote(id, choice)
  }


  const initActors = async () => {
    console.log("initActors")
    console.log(principal)

    if (!principal) return;
    const daoCanisterId = process.env.DAO_CANISTER_ID
    const daoActor = await window.ic.plug.createActor({
      canisterId: daoCanisterId,
      interfaceFactory: daoFactory,
    });
    setDaoCanister(daoActor)
    console.log(daoActor)
    const res = await daoActor.is_registered();
    console.log(res)
    if (res) {
      setIsRegistered(true)
    } else {
      setIsRegistered(false)
    }
  }



  const verifyConnection = async () => {
    const connected = await window.ic.plug.isConnected();
    if (!connected) {

      // Whitelist
      const whitelist = [
        process.env.DIP721_CANISTER_ID,
        process.env.STORAGE_CANISTER_ID
      ];

      let host = "https://mainnet.dfinity.network"
      if (process.env.DFX_NETWORK !== "ic") {
        host = "http://127.0.0.1:4943";
      }

      // Callback to print sessionData
      const onConnectionUpdate = async () => {
        console.log(window.ic.plug.sessionManager.sessionData)
        let principal = await window.ic.plug.getPrincipal()
        setPrincipal(Principal.fromUint8Array(principal._arr))

      }
      // Make the request
      try {
        const publicKey = await window.ic.plug.requestConnect({
          whitelist,
          host,
          onConnectionUpdate,
          timeout: 50000
        });

        console.log(`The connected user's public key is:`, publicKey);
      } catch (e) {
        console.log(e);
      }
    }
    let principal = await window.ic.plug.getPrincipal()
    setPrincipal(principal)
  };

  useEffect(() => {
    initActors()
  }, [principal]);

  useEffect(() => {
    const intervalId = setInterval(async () => {
      if (isRegistered) {
        //update proposals
        let proposals = await daoCanister.get_all_proposals();
        setProposals(proposals)
      }
      else {
        const res = await daoCanister.is_registered();
        console.log(res)
        if (res) {
          setIsRegistered(true)
        } else {
          setIsRegistered(false)
        }
      }
    }, 2000);
    return () => clearInterval(intervalId);
  }, [isRegistered]);


  const connect = () => {
    verifyConnection()
  }

  const disconnect = async () => {
    window.ic.plug.sessionManager.disconnect()

    setPrincipal(null)
    //clean all state
  }

  return (
    <div className="bg-gray-900 w-screen h-screen flex flex-col  ">
      <div className="self-end p-8 ">
        {principal && <button onClick={disconnect}>Disconnect</button>}
        {!principal && <button onClick={connect}>Connect</button>}
      </div>
      <div className="flex flex-row justify-center items-center">
        <a href="https://vitejs.dev" target="_blank">
          <img src="/vite.svg" className="logo vite " alt="Vite logo" />
        </a>
        <a href="https://reactjs.org" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
        <a
          href="https://internetcomputer.org/docs/current/developer-docs/build/cdks/motoko-dfinity/motoko/"
          target="_blank"
        >
          <span className="logo-stack">
            <img
              src={motokoShadowLogo}
              className="logo motoko-shadow"
              alt="Motoko logo"
            />
            <img src={motokoLogo} className="logo motoko" alt="Motoko logo" />
          </span>
        </a>
      </div>
      {principal && <>
        <p>Logged in</p>
        {isRegistered && <>
          <p>Registered!!</p>
          <div>
            <p>Create Proposal</p>
            <input ref={proposalDescription}></input>
            <input ref={proposalBody}></input>
            <button onClick={submitProposal}>Submit</button>
          </div>

          <div className='flex flex-row'>
            {proposals.map((e, i) => {
              console.log(e)
              return (
                <div className='flex flex-col m-16'>
                  <p>id : {e.id}</p>
                  <p>title: {e.title}</p>
                  <p>descitpion: {e.description}</p>
                  <p>approves: {e.approve_votes}</p>
                  <p>rejects: {e.reject_votes}</p>
                  <p>rejects: {JSON.stringify(e.state)}</p>
                  <button onClick={() => { vote(e.id, "approve") }}>Approve</button>
                  <button onClick={() => { vote(e.id, "reject") }}>Reject</button>
                </div>)
            })}
          </div>
        </>
        }

        {!isRegistered && <>
          <p>Insert your canister NFT id to register:</p>
          <input ref={canisterInputField}></input>
          <button onClick={tryRegister}>submit</button>
        </>
        }
      </>
      }

      {!principal && <>
        <p>Login to interact...</p>
      </>}
    </div>
  );
}

const router = createBrowserRouter(createRoutesFromElements(
  <Route path="/" element={<RootLayout />} errorElement={<ErrorPage />}>
    <Route index element={<App />} />
  </Route>
));


export default () => (
  <RouterProvider router={router} />
)

// export default App;