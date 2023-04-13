import React from 'react'
import { Link } from 'react-router-dom';
function Proposal(props) {
    let e = props.element
    console.log(e)
    let state = "open"
    if (!e) return;
    if (e.state.approved === null) state = "approved"
    else if (e.state.rejected === null) state = "rejected"
    let element = null
    if (e.vote && e.vote.length > 0) {
        if (e.vote[0].approved === null)
            element = <p>Your Vote: Approve</p>
        else if (e.vote[0].rejected === null)
            element = <p>Your Vote: Reject</p>
    } else {
        element = <>
            <button onClick={() => { props.vote(e.id, "approve") }}>Approve</button>
            <button onClick={() => { props.vote(e.id, "reject") }}>Reject</button>
        </>
    }
    let type = "Poll"
    //if (change_data.poll===null) type = "poll"
    if (e.change_data.change_name) type = `Change Name to ${e.change_data.change_name}`
    if (e.change_data.change_logo) type = `Change Logo to ${e.change_data.change_logo}`
    return (
        <div className='flex flex-col m-16 rounded-md border-indigo-800 border p-1 w-80 h-80'>

            <p>Id : {e.id}</p>
            <p>Title: {e.title}</p>
            <p>Description: {e.description}</p>
            <p>Approves: {Number(e.approve_votes)}</p>
            <p>Rejects: {Number(e.reject_votes)}</p>
            <p>State: {state}</p>
            <p>Type: {type}</p>
            {element}
        </div>)
}

{/* <Link to={{
    pathname: `/proposal/${Number(e.id)}`,
    state: {
        data: {
            title: e.title,
            description: e.description,
        }
    }
}} key={e.id}> */}

export default Proposal