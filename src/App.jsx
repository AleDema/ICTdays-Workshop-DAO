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
  const [message, setMessage] = useState("");
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
    setMessage("")
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
      setMessage("")
      setIsRegistered(true)
    } else {
      setMessage("")
      setIsRegistered(false)
    }
  }

  const tryRegister = async () => {
    let res = await daoCanister.register(Principal.fromText(canisterInputField.current.value))
    console.log(res) //TODO add errors in UI?
    setMessage("Waiting for confirm")
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
      // setAwaitingConfirm(false)
      setMessage("")
      let proposals = await daoCanister.get_all_proposals_with_vote();
      setProposals(proposals.reverse())
      let vp = await daoCanister.get_current_vp();
      setVp(vp)
    }
  }

  useEffect(() => {
    setMessage("Loading...")
    initActors()
    // setMessage("")
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

    const checkRegister = setInterval(async () => {
      if (daoCanister == null) return;
      const res = await daoCanister.is_registered();
      console.log(res)
      if (res) {
        setMessage("")
        setIsRegistered(true)
        clearInterval(checkRegister)
      } else {
        setIsRegistered(false)
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [isRegistered]);

  return (
    <>
      <div className="p-8 flex justify-between items-center w-full max-w-5xl mx-auto">
        {<p className='text-white font-bold'>{daoName}</p>}
        {daoLogo !== "" && <img src={daoLogo} className="logo" alt="dao logo" />}

        <div>
          {principal && <button onClick={disconnect}>Disconnect</button>}
          {!principal && <button onClick={connect}>Connect</button>}
        </div>

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
          <div className='flex-col flex justify-center items-center max-w-lg m-1 mx-auto gap-6 w-full'>
            <p className='text-white font-semibold'>Create Proposal</p>
            <div className='flex flex-col gap-2 items-start justify-start w-full'>
              <input type="text" className="px-2 py-1 rounded-lg w-full" ref={proposalTitle} maxLength="20" placeholder="Your proposal title" />
              <p className='text-[12px] font-thin opacity-70'>Insert the title of your proposal</p>
            </div>

            <div className='flex flex-col gap-2 items-start justify-start w-full'>
              <input type="text" className="px-2 py-1 rounded-lg w-full" ref={proposalDescription} maxLength="50" placeholder="Your proposal content" />
              <p className='text-[12px] font-thin opacity-70'>Insert the content of your proposal</p>
            </div>

            {
              proposalType === "change_name" && (
                <div className='flex flex-col gap-2 items-start justify-start w-full'>
                  <input type="text" className="px-2 py-1 rounded-lg w-full" maxLength="20" placeholder="New DAO name" value={proposalChange}
                    onChange={(e) => setProposalChange(e.target.value)} />
                  <p className='text-[12px] font-thin opacity-70'>Insert the new name of the DAO</p>
                </div>
              )
            }

            {
              proposalType === "change_logo" && (
                <div className='flex flex-col gap-2 items-start justify-start w-full'>
                  <input type="text" className="px-2 py-1 rounded-lg w-full" maxLength="100" placeholder="New logo url" value={proposalChange}
                    onChange={(e) => setProposalChange(e.target.value)} />
                  <p className='text-[12px] font-thin opacity-70'>Insert the new url of the logo</p>
                </div>
              )
            }
            <select className="w-full px-2 py-1 rounded-lg" onChange={handleChange}>
              {options.map((option) => (
                <option className="text-white w-full" key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button className='bg-[#0C93EA] w-full' onClick={submitProposal}>Submit</button>
          </div>

          <div className='flex flex-row flex-wrap'>
            {proposals.map((e, i) => {
              return (<Proposal vote={vote} vp={vp} element={e} key={i}></Proposal>)
            })}
          </div>
        </>
        }

        {isRegistered === false &&
          <div className='flex flex-col max-w-lg m-1 mx-auto gap-6 w-full'>
            <div className='flex flex-col gap-2 items-start justify-start'>
              <input type="text" className="px-2 py-1 rounded-lg w-full" ref={canisterInputField} placeholder="Your canisert id" />
              <p className='text-[12px] font-thin opacity-70'>Insert the ID of your NFT canister</p>
            </div>


            <button onClick={tryRegister} className='bg-[#0C93EA] w-full'>Add to DAO</button>

            {/* {awaitingConfirm && <p>Awaiting Confirmation...</p>} */}
          </div>
        }
        <p>{message}</p>
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
