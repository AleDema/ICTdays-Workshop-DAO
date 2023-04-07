import Principal "mo:base/Principal";
import Buffer "mo:base/Buffer";
import Result "mo:base/Result";
import Option "mo:base/Option";
import Debug "mo:base/Debug";
import Trie "mo:base/Trie";
import Nat "mo:base/Nat";
import Float "mo:base/Float";
import Int "mo:base/Int";
import Hash "mo:base/Hash";
import Iter "mo:base/Iter";
import Array "mo:base/Array";
import Time "mo:base/Time";
import Text "mo:base/Text";
import Blob "mo:base/Blob";
import Map "mo:map/Map";
import G "GovernanceTypes";
import Prelude "mo:base/Prelude";
import Bool "mo:base/Bool";

shared ({ caller }) actor class DAO() = this {

  //change on main
  let IS_LOCAL_ENV = true;
  var DEV_MODE = true;
  let main_ledger_principal = "db3eq-6iaaa-aaaah-abz6a-cai";
  let local_ledger_principal = "l7jw7-difaq-aaaaa-aaaaa-c";
  var icrc_principal = main_ledger_principal;
  if (IS_LOCAL_ENV) {
    icrc_principal := local_ledger_principal;
  };

  type ProposalId = G.ProposalId;
  type Proposal = G.Proposal;
  type ProposalType = G.ProposalType;
  type ProposalState = G.ProposalState;
  type VotingOptions = G.VotingOptions;
  type Vote = G.Vote;

  let { ihash; nhash; thash; phash; calcHash } = Map;

  type UserData = {
    isAdmin : Bool;
    canisterUsed : Principal;
  };

  private stable var proposal_id_counter = 0;
  private stable let proposals = Map.new<Nat, Proposal>(nhash);
  stable var canister_owner = caller;
  private stable let users = Map.new<Principal, UserData>(phash);
  private stable let used_canisters = Map.new<Principal, Principal>(phash);
  private stable let user_votes = Map.new<Principal, Map.Map<ProposalId, Vote>>(phash);
  //private stable var canister_owner = "7tbn6-kjdof-qz2ic-5pdwg-tszmq-5d7no-3pofa-ulqe4-qpztk-4rf7f-gae";

  /////////////
  //GOVERNANCE
  ////////////

  private func is_registered(user : Principal) : Bool {
    let res = Map.get(users, phash, user);
    switch (res) {
      case (?user) {
        return true;
      };
      case (null) {
        return false;
      };
    };
  };

  public shared ({ caller }) func get_status() : async Bool {
    return is_registered(caller);
  };

  public func is_admin(user : Principal) : async Bool {
    let res = Map.get(users, phash, user);
    switch (res) {
      case (?userData) {
        if (userData.isAdmin) return true;
        return false;
      };
      case (null) {
        return false;
      };
    };
  };

  public func ban_user(user : Principal) : async Result.Result<Text, Text> {
    let res = Map.get(users, phash, user);
    switch (res) {
      case (?value) {
        Map.delete(users, phash, user);
        return #ok("banned");
      };
      case (null) {
        return #err("No user");
      };
    };
  };

  private func add_user(user : Principal, canister : Principal) : () {
    let data : UserData = {
      isAdmin = false;
      canisterUsed = canister;
    };
    ignore Map.put(users, phash, user, data);
    ignore Map.put(used_canisters, phash, canister, user);
  };

  public func notifier_callback(user : Principal, canister : Principal, result : Bool) : () {
    Debug.print("HELLO");
    if (result) {
      add_user(user, canister);
    };
  };

  let local_notifier_principal = "renrk-eyaaa-aaaaa-aaada-cai";
  var notifier_principal = "renrk-eyaaa-aaaaa-aaada-cai";
  if (IS_LOCAL_ENV) {
    notifier_principal := local_notifier_principal;
  };

  public type NotifierType = actor {
    check_nft_canister : (user : Principal, canister : Principal, callback : shared (Principal, Principal, Bool) -> ()) -> ();
  };

  let notifier_canister = actor (notifier_principal) : NotifierType;

  public shared ({ caller }) func register(canister : Principal) : async () {
    //contact notifier
    notifier_canister.check_nft_canister(caller, canister, notifier_callback);
  };

  public shared (msg) func submit_proposal(title : Text, description : Text, change : ProposalType) : async () {
    if (isAnonymous(msg.caller) or not is_registered(msg.caller)) return;

    let p : Proposal = {
      id = proposal_id_counter;
      title = title;
      description = description;
      change_data = change;
      approve_votes = 0;
      reject_votes = 0;
      state = #open;
    };
    ignore Map.put(proposals, nhash, p.id, p);
    Debug.print("CREATED PROPOSAL");
    proposal_id_counter := proposal_id_counter +1;
  };

  public query func get_proposal(id : ProposalId) : async Result.Result<Proposal, Text> {
    switch (Map.get(proposals, nhash, id)) {
      case (null) {
        return #err("no proposal");
      };
      case (?proposal) {
        return #ok(proposal);
      };
    };
  };

  public query func get_all_proposals() : async [Proposal] {
    let iter = Map.vals<Nat, Proposal>(proposals);
    let arr = Iter.toArray(iter);
    Debug.print(debug_show (arr));
    arr;
  };

  public shared ({ caller }) func vote(id : ProposalId, choice : VotingOptions) : async () {
    if (isAnonymous(caller) or not is_registered(caller)) return;
    Debug.print("vote");
    Debug.print(debug_show (id));
    Debug.print(debug_show (choice));

    let p : Proposal = do {
      switch (Map.get(proposals, nhash, id)) {
        case (?proposal) proposal;
        case (_) return //does it return null or return the func? seems to work
      };
    };

    //check if already voted
    var hasVoted = false;

    let test1 : ?Map.Map<ProposalId, Vote> = do ? {
      let first = Map.get(user_votes, phash, caller);
      first!;
    };

    let test2 : ?Vote = do ? {
      let first = Map.get(user_votes, phash, caller);
      let second = Map.get(first!, nhash, id);
      second!;
    };

    switch (test1, test2) {
      case (?exists1, ?exist2) {
        hasVoted := true;
      };
      case (?exist1, _) {
        var init_votes : Map.Map<ProposalId, Vote> = Map.new<ProposalId, Vote>(nhash);
        ignore Map.put(exist1, nhash, id, { vote = choice });
      };
      case (_, _) {
        //both false
        var init_votes : Map.Map<ProposalId, Vote> = Map.new<ProposalId, Vote>(nhash);
        ignore Map.put(init_votes, nhash, id, { vote = choice });
        ignore Map.put(user_votes, phash, caller, init_votes);
      };
    };

    if (hasVoted) return;

    //if approved or rejected can't vote'
    if (p.state == #approved or p.state == #rejected) return;

    var state = p.state;
    var approve_votes = p.approve_votes;
    var reject_votes = p.reject_votes;
    switch choice {
      case (#approve) {
        if (p.approve_votes + 1 >= Map.size(users) / 2) {
          state := #approved;
        };
        approve_votes := p.approve_votes + 1;
      };
      case (#reject) {
        if (p.reject_votes + 1 >= Map.size(users) / 2) {
          state := #rejected;
        };
        reject_votes := p.reject_votes + 1;
      };
    };

    let updated_p = {
      p with state = state;
      reject_votes = reject_votes;
      approve_votes = approve_votes;
    };
    Debug.print("end vote");
    ignore Map.put(proposals, nhash, p.id, updated_p);
    //Debug.print(debug_show (Map.get(proposals, nhash, id)));
    if (state == #approved) await modify_parameters(p.change_data);

  };

  private func modify_parameters(change : ProposalType) : async () {

    // switch (change) {
    //   case (#change_text(new_text)) {
    //     ignore webpage_canister.update_body(new_text);
    //   };
    //   case (#update_min_vp(new_vp)) {
    //     var sanitized_vp = new_vp;
    //     if (sanitized_vp < 0) {
    //       sanitized_vp := 1;
    //     };
    //     MIN_VP_REQUIRED := sanitized_vp;
    //   };
    //   case (#update_threshold(new_th)) {
    //     var sanitized_th = new_th;
    //     if (sanitized_th < 0) {
    //       sanitized_th := 1;
    //     };
    //     PROPOSAL_VP_THESHOLD := sanitized_th;
    //   };
    //   case (#toggle_quadratic) {
    //     quadratic_voting();
    //   };
    //   case (#toggle_advanced_mode) {
    //     if (current_vp_mode == #advanced) {
    //       current_vp_mode := #basic;
    //     } else if (current_vp_mode == #basic) {
    //       current_vp_mode := #advanced;
    //     };
    //   };
  };

  private func isAnonymous(caller : Principal) : Bool {
    Principal.equal(caller, Principal.fromText("2vxsx-fae"));
  };

  private func isCanisterPrincipal(p : Principal) : Bool {
    let principal_text = Principal.toText(p);
    let correct_length = Text.size(principal_text) == 27;
    let correct_last_characters = Text.endsWith(principal_text, #text "-cai");

    if (Bool.logand(correct_length, correct_last_characters)) {
      return true;
    };
    return false;
  };

};
