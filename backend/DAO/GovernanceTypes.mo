module GovernanceTypes {

  public type ProposalId = Nat;
  public type Proposal = {
    id : ProposalId;
    title : Text;
    description : Text;
    state : ProposalState;
    approve_votes : Nat;
    reject_votes : Nat;
    change_data : ProposalType;
  };

  // pType : ProposalType

  public type ProposalType = {
    #change_text : Text; //just text
    #change_logo : Text //url
  };

  public type ProposalState = {
    #approved;
    #rejected;
    #open;
  };

  public type VotingOptions = {
    #approve;
    #reject;
  };

  public type Vote = {
    vote : VotingOptions;
  };
};
