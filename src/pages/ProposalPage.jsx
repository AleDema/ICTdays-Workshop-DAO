import React from 'react'
import { useLocation } from 'react-router-dom';
function ProposalPage() {
    const location = useLocation();
    //const passedData = location.state.data;
    console.log(location)
    return (
        <div>ProposalPage</div>
    )
}

export default ProposalPage