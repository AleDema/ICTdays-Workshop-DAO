import Debug "mo:base/Debug";
import Text "mo:base/Text";
import Principal "mo:base/Principal";
import NftTypes "./NftTypes";

//Used to retrieve data from other canisters safely
actor {

  type Callback = shared (Principal, Principal) -> (); //user, canister, result

  public type NftType = actor {
    nameDip721 : () -> async (Text);
  };

  public shared func check_nft_canister(user : Principal, canister : Principal, callback : Callback) : () {
    let nftCanister = actor (Principal.toText(canister)) : NftType;
    let test = await nftCanister.nameDip721();
    Debug.print(debug_show (test));
    callback(user, canister);
  };
};
