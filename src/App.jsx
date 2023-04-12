import { useEffect, useState, useRef } from 'react';
import './index.css';
import motokoLogo from './assets/motoko_moving.png';
import motokoShadowLogo from './assets/motoko_shadow.png';
import RootLayout from './layouts/RootLayout';
import ErrorPage from './pages/ErrorPage';
import { idlFactory as daoFactory } from './declarations/DAO';
import { DAO } from './declarations/DAO';
import { Principal } from '@dfinity/principal';

import {
  createRoutesFromElements, Link, createBrowserRouter,
  RouterProvider,
  Route
} from "react-router-dom";
import Proposal from './components/Proposal';


const options = [
  { value: "poll", label: "Make a poll" },
  { value: "change_logo", label: "Update DAO Logo" },
  { value: "change_name", label: "Update DAO Name" },
];

function App() {
  const [principal, setPrincipal] = useState(null);
  const [daoCanister, setDaoCanister] = useState(null);
  const [isRegistered, setIsRegistered] = useState(null);
  const [proposals, setProposals] = useState([]);
  const canisterInputField = useRef(null);
  const proposalDescription = useRef(null);
  const proposalBody = useRef(null);
  const [proposalType, setProposalType] = useState("poll");
  const [proposalChange, setProposalChange] = useState("");
  const [daoName, setDaoName] = useState("");
  const [daoLogo, setDaoLogo] = useState("");

  const tryRegister = async () => {
    daoCanister.register(Principal.fromText(canisterInputField.current.value))
  }

  const submitProposal = async () => {
    let propVariant = {}

    if (proposalType === "poll") {
      propVariant = { poll: null }
    }
    else if (proposalType === "change_logo") {
      propVariant = { change_logo: proposalChange }
    }
    else if (proposalType === "change_name") {
      propVariant = { change_name: proposalChange }
    }

    console.log(propVariant)

    // setProposalTitle("")
    // setProposalDescription("")
    // setProposalChange("")
    let res = await daoCanister.submit_proposal(proposalDescription.current.value, proposalBody.current.value, propVariant)
    if (res.ok) {
      console.log("res.ok")
      console.log(res.ok)
      setProposals((oldProposals) => { return [res.ok, ...oldProposals] })
    } else if (res.err) {
      console.log(res.err)
    }
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
    console.log(`registered: ${res}`)
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
        process.env.DAO_CANISTER_ID,
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
    const init = async () => {
      let params = await DAO.get_dao_parameters()
      setDaoName(params.name)
      setDaoLogo(params.logo)
    }
    init()
  }, []);

  const fetchProposals = async () => {
    if (daoCanister == null) return;
    if (isRegistered) {
      //update proposals
      let proposals = await daoCanister.get_all_proposals_with_vote();
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
  }

  useEffect(() => {
    const init = async () => {
      fetchProposals()
    }
    init()
    const intervalId = setInterval(async () => {
      fetchProposals()
    }, 10000);
    return () => clearInterval(intervalId);
  }, [isRegistered]);


  const connect = () => {
    verifyConnection()
  }

  const disconnect = async () => {
    window.ic.plug.sessionManager.disconnect()

    //clean all state
    setPrincipal(null)
    setProposals(null)
    setDaoCanister(null)
    setIsRegistered(false)
  }

  // Handle change event on select tag
  const handleChange = (event) => {
    //console.log(event.target.value)
    setProposalType(event.target.value);
  }

  return (
    <div className="bg-gray-900 w-screen h-screen flex flex-col  ">
      <div className="self-end p-8 ">
        {principal && <button onClick={disconnect}>Disconnect</button>}
        {!principal && <button onClick={connect}>Connect</button>}
        {<p>{daoName}</p>}
        {<p>{daoLogo}</p>}
      </div>
      <div className="flex flex-row justify-center items-center">
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
          <div className='flex-col flex justify-center items-center self-center'>
            <p>Create Proposal</p>
            <input ref={proposalDescription} className='max-w-md m-1'></input>
            <input ref={proposalBody} className='max-w-5xl m-1 h-16'></input>
            {proposalType === "change_name" ? <input className="text-black w-5/12 h-44" type="text"
              placeholder="New name"
              value={proposalChange}
              onChange={(e) => setProposalChange(e.target.value)}>

            </input>
              : null}
            {proposalType === "change_logo" ? <input className="text-black w-5/12 h-44" type="text"
              placeholder="Logo URL"
              value={proposalChange}
              onChange={(e) => setProposalChange(e.target.value)}>

            </input>
              : null}
            <select className="text-black  w-5/12" onChange={handleChange}>
              {options.map((option) => (
                <option className="text-black  w-5/12" key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button onClick={submitProposal}>Submit</button>
          </div>

          <div className='flex flex-row flex-wrap'>
            {proposals.map((e, i) => {
              return (<Proposal vote={vote} element={e} key={i}></Proposal>)
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
