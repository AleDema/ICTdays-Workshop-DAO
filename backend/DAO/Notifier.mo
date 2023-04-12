import Debug "mo:base/Debug";
import Text "mo:base/Text";
import Principal "mo:base/Principal";
import List "mo:base/List";
import NftTypes "./NftTypes";

//Used to retrieve data from other canisters safely
shared ({ caller }) actor class Notifier() = this {

  stable var custodians = List.make<Principal>(caller);
  type Callback = shared (Principal, Principal) -> (); //user, canister, result

  public type NftType = actor {
    nameDip721 : () -> async (Text);
  };

  private func isCustodian(user : Principal) : Bool {
    if (not List.some(custodians, func(custodian : Principal) : Bool { custodian == user })) {
      return false;
    };
    return true;
  };

  public shared ({ caller }) func check_nft_canister(user : Principal, canister : Principal, callback : Callback) : () {
    if (not isCustodian(caller)) {
      return;
    };
    let nftCanister = actor (Principal.toText(canister)) : NftType;
    let test = await nftCanister.nameDip721();
    Debug.print(debug_show (test));
    callback(user, canister);
  };
};
