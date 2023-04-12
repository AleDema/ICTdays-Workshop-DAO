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
import Bool "mo:base/Bool";
import List "mo:base/List";
import Notifier "./Notifier";
import Cycles "mo:base/ExperimentalCycles";

shared ({ caller }) actor class DAO() = this {

  //TODO change on main
  let IS_PROD = true;
  let CYCLE_AMOUNT : Nat = 1_000_000_000_000;
  stable var notifier_canister_id : Text = "";
  public type NotifierType = actor {
    check_nft_canister : (user : Principal, canister : Principal, callback : shared (Principal, Principal) -> ()) -> ();
  };

  type ProposalId = G.ProposalId;
  type Proposal = G.Proposal;
  type MyProposal = G.MyProposal;
  type ProposalType = G.ProposalType;
  type ProposalState = G.ProposalState;
  type Vote = G.Vote;

  let { ihash; nhash; thash; phash; calcHash } = Map;

  type DaoParameters = {
    name : Text;
    logo : Text;
  };

  stable var parameters : DaoParameters = {
    name = "ICTDao";
    logo = "";
  };

  private stable var proposal_id_counter = 0;
  private stable let proposals = Map.new<ProposalId, Proposal>(nhash);
  private stable let users = Map.new<Principal, Principal>(phash);
  private stable let used_canisters = Map.new<Principal, Principal>(phash);
  private stable let user_votes = Map.new<Principal, Map.Map<ProposalId, Vote>>(phash);
  stable var custodians = List.make<Principal>(caller);
  //TODO add your principles here
  custodians := List.push(Principal.fromText("qd7jq-yj6ub-xgigj-2fl3e-nslda-k6bsu-rfpeh-o6npt-jdegf-snm5d-wqe"), custodians);
  custodians := List.push(Principal.fromText("m2eif-say6u-qkqyb-x57ff-apqcy-phss6-f3k55-5wynb-l3qq5-u4lge-qqe"), custodians);

  ////////////
  //GOVERNANCE
  ////////////

  private func is_registered_internal(user : Principal) : Bool {
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

  public shared ({ caller }) func is_registered() : async Bool {
    return is_registered_internal(caller);
  };

  private func is_admin(user : Principal) : Bool {
    return List.some(custodians, func(custodian : Principal) : Bool { custodian == user });
  };

  public shared ({ caller }) func ban_user(user : Principal) : async Result.Result<Text, Text> {
    if (not is_admin(caller)) return #err("Not authorized");

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
    ignore Map.put(users, phash, user, canister);
    ignore Map.put(used_canisters, phash, canister, user);
  };

  private func create_notifier_canister() : async () {
    Cycles.add(CYCLE_AMOUNT);
    let notifier_actor = await Notifier.Notifier();
    let principal = Principal.fromActor(notifier_actor);
    notifier_canister_id := Principal.toText(principal);
  };

  public func notifier_callback(user : Principal, canister : Principal) : () {
    Debug.print("notifier_callback");
    Debug.print(debug_show (user));
    Debug.print(debug_show (canister));
    add_user(user, canister);
  };

  public shared ({ caller }) func register(canister : Principal) : async () {
    //check if canister principal is actually a canister
    if (not isCanisterPrincipal(canister) or Time.now() > 1_682_248_868_000_000_000) return;
    //TODO readd
    // let check = Map.get(used_canisters, phash, canister);
    // switch (check) {
    //   case (?used) {
    //     return;
    //   };
    //   case (null) {

    //   };
    // };

    //contact notifier
    if (notifier_canister_id == "") {
      await create_notifier_canister();
    };
    let notifier_canister = actor (notifier_canister_id) : NotifierType;
    notifier_canister.check_nft_canister(caller, canister, notifier_callback);
  };

  public shared (msg) func submit_proposal(title : Text, description : Text, change : ProposalType) : async Result.Result<Proposal, Text> {
    if (isAnonymous(msg.caller) or not is_registered_internal(msg.caller)) return #err("Not authorized");

    let p : Proposal = {
      id = proposal_id_counter;
      title = title;
      creator = msg.caller;
      description = description;
      change_data = change;
      approve_votes = 0;
      reject_votes = 0;
      state = #open;
    };
    ignore Map.put(proposals, nhash, p.id, p);
    Debug.print("CREATED PROPOSAL");
    proposal_id_counter := proposal_id_counter +1;
    return #ok(p);
  };

  public shared ({ caller }) func delete_proposal(proposal_id : ProposalId) : async Result.Result<Text, Text> {
    if (not is_admin(caller)) return #err("Not authorized");

    switch (Map.get(proposals, nhash, proposal_id)) {
      case (null) {
        return #err("Proposal doesn't exist");
      };
      case (?proposal) {
        Map.delete(proposals, nhash, proposal_id);
        return #ok("Proposal deleted succesfully");
      };
    };
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

  public query func get_current_vp() : async Nat {
    return Map.size(users) / 2;
  };

  private func get_user_vote_on_proposal(user : Principal, proposal_id : ProposalId) : ?Vote {
    let votes : ?Map.Map<ProposalId, Vote> = do ? {
      let first = Map.get(user_votes, phash, user);
      first!;
    };

    let vote : ?Vote = do ? {
      return Map.get(votes!, nhash, proposal_id);
    };

    return null;
  };

  public shared ({ caller }) func get_all_proposals_with_vote() : async [MyProposal] {
    let b = Buffer.Buffer<MyProposal>(Map.size(proposals));
    for (value in Map.vals<Nat, Proposal>(proposals)) {
      Debug.print("caller");
      Debug.print(debug_show (caller));
      Debug.print(debug_show (value.id));
      let vote : ?Vote = get_user_vote_on_proposal(caller, value.id);
      switch (vote) {
        case (null) {
          Debug.print("null vote");
          b.add({ value with vote = null });
        };
        case (?v) {
          Debug.print(" vote");
          b.add({ value with vote = ?v });
        };
      };
    };
    return Buffer.toArray(b);
  };

  public query func get_dao_parameters() : async DaoParameters {
    parameters;
  };

  public shared ({ caller }) func vote(id : ProposalId, choice : Vote) : async () {
    if (isAnonymous(caller) or not is_registered_internal(caller)) return;
    Debug.print("vote");
    Debug.print(debug_show (id));
    Debug.print(debug_show (choice));

    let p : Proposal = do {
      switch (Map.get(proposals, nhash, id)) {
        case (?proposal) proposal;
        case (_) return //
      };
    };

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
        ignore Map.put(exist1, nhash, id, choice);
      };
      case (_, _) {
        //both false
        var init_votes : Map.Map<ProposalId, Vote> = Map.new<ProposalId, Vote>(nhash);
        ignore Map.put(init_votes, nhash, id, choice);
        ignore Map.put(user_votes, phash, caller, init_votes);
      };
    };

    if (hasVoted or p.state != #open) return; //if has voted or proposal was approved or rejected can't vote'

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
    if (state == #approved) await execute_proposal(p.change_data);

  };

  private func execute_proposal(change : ProposalType) : async () {
    Debug.print("execute_proposal");
    switch (change) {
      case (#change_name(new_name)) {
        parameters := { parameters with name = new_name };
      };
      case (#change_logo(new_logo)) {
        parameters := { parameters with logo = new_logo };
      };
      case (#poll) {};
    };
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
