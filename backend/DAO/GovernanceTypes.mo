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

  // pType : ProposalType

  public type ProposalType = {
    #change_text : Text; //just text
    #change_logo : Text; //url
    #poll : () //just a poll
  };

  public type ProposalState = {
    #approved;
    #rejected;
    #open;
  };

  //TODO change this
  public type Vote = {
    #approve;
    #reject;
  };

  // public type Vote = {
  //   vote : VotingOptions;
  // };
};
