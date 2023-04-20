import React from 'react'

function Proposal(props) {
    let e = props.element
    console.log(e)
    let state = "Open"
    if (!e) return;
    if (e.state.approved === null) state = "Approved"
    else if (e.state.rejected === null) state = "Rejected"
    let element = null
    if (e.vote && e.vote.length > 0) {
        if (e.vote[0].approve === null)
            element = <p>Your Vote: Approve</p>
        else if (e.vote[0].reject === null)
            element = <p>Your Vote: Reject</p>
    } else {
        if (e.state.open === null) {
            element = <div className='flex flex-row self-center'>
                <button className='bg-[#0C93EA] mr-3' onClick={() => { props.vote(e.id, "approve") }}>Approve</button>
                <button className='bg-[#0C93EA]' onClick={() => { props.vote(e.id, "reject") }}>Reject</button>
            </div>
        } else {
            element = <p>Your Vote: None</p>
        }
    }
    let type = "Poll"
    //if (change_data.poll===null) type = "poll"
    if (e.change_data.change_name) type = `Change Name to ${e.change_data.change_name}`
    if (e.change_data.change_logo) type = `Change Logo to ${e.change_data.change_logo}`
    return (
        <div className='flex flex-col m-16 border-indigo-800 border rounded-lg p-6 w-96 backdrop-blur-md'>
            <p className='text-white text-left'>Id : {Number(e.id)}</p>
            <p className='text-white font-bold text-left'>Title: {e.title}</p>
            <p className='text-white text-left'>Description: {e.description}</p>
            <p className='text-white text-left'>Approvals: {Number(e.approve_votes)} / {Number(props.vp)}</p>
            <p className='text-white text-left'>Rejections: {Number(e.reject_votes)} / {Number(props.vp)}</p>
            <p className='text-white text-left'>State: {state}</p>
            <p className='text-white mb-4 text-left' >Type: {type}</p>
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