import Debug "mo:base/Debug";
shared actor class Notifier() = this {

  type Callback = shared (Principal, Principal, Bool) -> (); //user, canister, result

  public type NotifierType = actor {
    nameDip721 : () -> async (Text);
  };

  let nftCanister = actor ("ryjl3-tyaaa-aaaaa-aaaba-cai") : NotifierType;

  public shared func check_nft_canister(user : Principal, canister : Principal, callback : Callback) : () {
    let test = await nftCanister.nameDip721();
    Debug.print(debug_show (test));
    callback(user, canister, true);
  };
};
