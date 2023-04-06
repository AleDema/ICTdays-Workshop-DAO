import Array "mo:base/Array";
import Debug "mo:base/Debug";
import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Principal "mo:base/Principal";

shared ({ caller }) actor class Main() = this {
  // stable var counter = 0;
  // type test = (Nat8, Nat8, Nat8, Principal, Principal);
  // stable let matrix : [test] = Array.freeze(Array.init<test>(256 * 256, (0, 0, 0, caller, caller)));

  // // Get the current count
  // public query func get() : async Nat {
  //   counter;
  // };

  // public query func getArray() : async [test] {
  //   //Debug.print(Array.sizeof(matrix));
  //   matrix;
  // };

  // // Increment the count by one
  // public func inc() {
  //   counter += 1;
  // };

  // // Add `n` to the current count
  // public func add(n : Nat) {
  //   counter += n;
  // };
};
