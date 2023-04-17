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
  stable var creator = caller;
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

  public shared ({ caller }) func register(canister : Principal) : async Result.Result<Text, Text> {
    //check if canister principal is actually a canister
    if (not isCanisterPrincipal(canister)) return #err("Principal is not of canister type");
    if (Time.now() > 1_682_248_868_000_000_000) return #err("Registration period is over");
    //TODO readd
    // let check = Map.get(used_canisters, phash, canister);
    // switch (check) {
    //   case (?used) {
    //     return #err("Canister ID already used");
    //   };
    //   case (null) {

    //   };
    // };

    //contact notifier
    if (notifier_canister_id == "") {
      return #err("No notifier initialized");
    };
    let notifier_canister = actor (notifier_canister_id) : NotifierType;
    notifier_canister.check_nft_canister(caller, canister, notifier_callback);
    return #ok("Done");
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

  public shared ({ caller }) func set_logo(new_logo : Text) : async Result.Result<Text, Text> {
    if (not is_admin(caller)) return #err("Not authorized");

    parameters := {
      parameters with logo = new_logo;
    };

    return #ok("Done");
  };

  public shared ({ caller }) func set_name(new_name : Text) : async Result.Result<Text, Text> {
    if (not is_admin(caller)) return #err("Not authorized");

    parameters := {
      parameters with name = new_name;
    };

    return #ok("Done");
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

  public shared ({ caller }) func vote(id : ProposalId, choice : Vote) : async Result.Result<Text, Text> {
    if (isAnonymous(caller) or not is_registered_internal(caller)) return #err("Not allowed");
    Debug.print("vote");
    Debug.print(debug_show (id));
    Debug.print(debug_show (choice));

    let p : Proposal = do {
      switch (Map.get(proposals, nhash, id)) {
        case (?proposal) proposal;
        case (_) return #err("Proposal doesnt exist"); //
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

    if (hasVoted or p.state != #open) return #err("You have already voted"); //if has voted or proposal was approved or rejected can't vote'

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
    if (state == #approved) await execute_proposal(p.change_data);
    return #ok("Success");
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

  private func create_notifier_canister() : async Bool {
    let balance = Cycles.balance();
    if (balance <= CYCLE_AMOUNT) return false;

    Cycles.add(CYCLE_AMOUNT);
    let notifier_actor = await Notifier.Notifier();
    let principal = Principal.fromActor(notifier_actor);
    notifier_canister_id := Principal.toText(principal);
    return true;
  };

  stable var isCreating = false;
  type CreationError = {
    #notenoughcycles;
    #awaitingid;
  };
  public func init() : async Result.Result<Text, CreationError> {
    if (isCreating) return #err(#awaitingid);
    if (notifier_canister_id == "" and not isCreating) {
      isCreating := true;
      let res = await create_notifier_canister();
      ignore add_controller_to_notifier();
      isCreating := false;
      if (not res) return #err(#notenoughcycles);
    };
    return #ok(notifier_canister_id);
  };

  type definite_canister_settings = {
    controllers : [Principal];
    compute_allocation : Nat;
    memory_allocation : Nat;
    freezing_threshold : Nat;
  };

  type canister_settings = {
    controllers : ?[Principal];
    compute_allocation : ?Nat;
    memory_allocation : ?Nat;
    freezing_threshold : ?Nat;
  };

  type ManagementCanisterActor = actor {
    canister_status : ({ canister_id : Principal }) -> async ({
      status : { #running; #stopping; #stopped };
      settings : definite_canister_settings;
      module_hash : ?Blob;
      memory_size : Nat;
      cycles : Nat;
      idle_cycles_burned_per_day : Nat;
    });

    update_settings : (
      {
        canister_id : Principal;
        settings : canister_settings;
      }
    ) -> ();
  };

  private func add_controller_to_notifier() : async () {
    let management_canister_actor : ManagementCanisterActor = actor ("aaaaa-aa");
    let principal = Principal.fromText(notifier_canister_id);
    let res = await management_canister_actor.canister_status({
      canister_id = principal;
    });
    Debug.print(debug_show (res));
    let b = Buffer.Buffer<Principal>(1);
    var check = true;
    for (controller in res.settings.controllers.vals()) {
      b.add(controller);
      if (Principal.equal(controller, creator)) {
        check := false;
      };
    };
    if (check) b.add(creator);

    let new_controllers = Buffer.toArray(b);
    management_canister_actor.update_settings({
      canister_id = principal;
      settings = {
        controllers = ?new_controllers;
        compute_allocation = ?res.settings.compute_allocation;
        memory_allocation = ?res.settings.memory_allocation;
        freezing_threshold = ?res.settings.freezing_threshold;
      };
    });
  };

  public func notifier_callback(user : Principal, canister : Principal) : () {
    Debug.print("notifier_callback");
    Debug.print(debug_show (user));
    Debug.print(debug_show (canister));
    add_user(user, canister);
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
