import { useEffect, useState, useRef } from 'react';
import './index.css';
import motokoLogo from './assets/motoko_moving.png';
import motokoShadowLogo from './assets/motoko_shadow.png';
import RootLayout from './layouts/RootLayout';
import ErrorPage from './pages/ErrorPage';
import ProposalPage from './pages/ProposalPage';
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
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);
  const [proposals, setProposals] = useState([]);
  const canisterInputField = useRef(null);
  const proposalTitle = useRef(null);
  const proposalDescription = useRef(null);
  const [proposalType, setProposalType] = useState("poll");
  const [proposalChange, setProposalChange] = useState("");
  const [daoName, setDaoName] = useState("");
  const [daoLogo, setDaoLogo] = useState("");
  const [vp, setVp] = useState(0);

  const connect = () => {
    verifyConnection()
  }

  const disconnect = async () => {
    //clean all state
    setPrincipal(null)
    setProposals([])
    setDaoCanister(null)
    setIsRegistered(null)
    setAwaitingConfirm(false)
    window.ic.plug.sessionManager.disconnect()

  }


  const verifyConnection = async () => {
    const connected = await window.ic.plug.isConnected();

    if (connected) {
      disconnect()
    };

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
      console.log("onConnectionUpdate")
      disconnect()
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
    let principal = await window.ic.plug.getPrincipal()
    setPrincipal(principal)
  };

  const initActors = async () => {
    console.log("Init Actors")
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
    console.log(`Registered: ${res}`)
    if (res) {
      setIsRegistered(true)
    } else {
      setIsRegistered(false)
    }
  }

  const tryRegister = async () => {
    let res = await daoCanister.register(Principal.fromText(canisterInputField.current.value))
    console.log(res) //TODO add errors in UI?
    setAwaitingConfirm(true)
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

    let res = await daoCanister.submit_proposal(proposalTitle.current.value, proposalDescription.current.value, propVariant)
    if (res.ok) {
      console.log("res.ok")
      console.log(res.ok)
      setProposals((oldProposals) => { return [res.ok, ...oldProposals] })
    } else if (res.err) {
      console.log(res.err)
    }
  }

  const vote = async (id, vote) => {
    let choice = { reject: null }
    if (vote == "approve") choice = { approve: null }
    let res = await daoCanister.vote(id, choice)
    if (res.ok) {
      const newList = proposals.map(proposal => {
        if (proposal.id === id) {
          if (vote == "approve")
            return { ...proposal, approved: null };
          else if (vote == "reject")
            return { ...proposal, rejected: null };
        } else {
          return proposal;
        }
      });
    }
  }

  // Handle change event on select tag
  const handleChange = (event) => {
    //console.log(event.target.value)
    setProposalType(event.target.value);
  }

  const fetchProposals = async () => {
    console.log("Fetching")
    if (daoCanister == null) return;
    if (isRegistered) {
      //update proposals
      setAwaitingConfirm(false)
      let proposals = await daoCanister.get_all_proposals_with_vote();
      setProposals(proposals.reverse())
      let vp = await daoCanister.get_current_vp();
      setVp(vp)
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
    initActors()
  }, [principal]);

  useEffect(() => {
    const init = async () => {
      fetchProposals()
      let params = await DAO.get_dao_parameters()
      setDaoName(params.name)
      setDaoLogo(params.logo)
    }
    init()
    const intervalId = setInterval(async () => {
      fetchProposals()
      let params = await DAO.get_dao_parameters()
      setDaoName(params.name)
      setDaoLogo(params.logo)
    }, 10000);
    return () => clearInterval(intervalId);
  }, [isRegistered]);

  return (
    <>
      <div className="self-end p-8 ">
        {principal && <button onClick={disconnect}>Disconnect</button>}
        {!principal && <button onClick={connect}>Connect</button>}
        {<p>{daoName}</p>}
        {daoLogo !== "" && <img src={daoLogo} className="logo" alt="dao logo" />}
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
        {isRegistered && <>
          <div className='flex-col flex justify-center items-center self-center'>
            <p>Create Proposal</p>
            <input ref={proposalTitle} maxLength="20" type="text" className='max-w-md m-1'></input>
            <input ref={proposalDescription} maxLength="50" type="text" className='max-w-5xl m-1 h-16'></input>
            {proposalType === "change_name" ? <input className="text-black w-5/12 h-44" maxLength="20" type="text"
              placeholder="New name"
              value={proposalChange}
              onChange={(e) => setProposalChange(e.target.value)}>

            </input>
              : null}
            {proposalType === "change_logo" ? <input className="text-black w-5/12 h-44" maxLength="100" type="text"
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
              return (<Proposal vote={vote} vp={vp} element={e} key={i}></Proposal>)
            })}
          </div>
        </>
        }

        {isRegistered === false &&
          <div className='max-w-md m-1'>
            <p>Insert your canister NFT id to register:</p>
            <input ref={canisterInputField}></input>
            <button onClick={tryRegister}>submit</button>
            {awaitingConfirm && <p>Awaiting Confirmation...</p>}
          </div>
        }
      </>
      }

      {!principal && <>
        <p>Login to interact...</p>
      </>}
    </>
  );
}

const router = createBrowserRouter(createRoutesFromElements(
  <Route path="/" element={<RootLayout />} errorElement={<ErrorPage />}>
    <Route index element={<App />} />
    <Route path="/proposal/:id" element={<ProposalPage />} />
  </Route>
));


export default () => (
  <RouterProvider router={router} />
)
