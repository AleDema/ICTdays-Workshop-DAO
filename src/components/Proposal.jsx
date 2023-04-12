import React from 'react'

function Proposal(props) {
    let e = props.element
    //console.log(e)
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

    return (
        <div className='flex flex-col m-16'>
            <p>Id : {e.id}</p>
            <p>Title: {e.title}</p>
            <p>Description: {e.description}</p>
            <p>Approves: {Number(e.approve_votes)}</p>
            <p>Rejects: {Number(e.reject_votes)}</p>
            <p>State: {state}</p>
            {element}
        </div>)
}

export default Proposal