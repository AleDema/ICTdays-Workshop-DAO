import Principal "mo:base/Principal";
module GovernanceTypes {

  public type ProposalId = Nat;
  public type Proposal = {
    id : ProposalId;
    title : Text;
    creator : Principal;
    description : Text;
    state : ProposalState;
    approve_votes : Nat;
    reject_votes : Nat;
    change_data : ProposalType;
  };

  public type MyProposal = {
    id : ProposalId;
    title : Text;
    creator : Principal;
    description : Text;
    state : ProposalState;
    approve_votes : Nat;
    reject_votes : Nat;
    change_data : ProposalType;
    vote : ?Vote;
  };

  public type ProposalType = {
    #change_name : Text; //just text
    #change_logo : Text; //url
    #poll : () //just a poll
  };

  public type ProposalState = {
    #approved;
    #rejected;
    #open;
  };

  public type Vote = {
    #approve;
    #reject;
  };
};
