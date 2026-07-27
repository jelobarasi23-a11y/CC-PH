import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CA25C2SRT6WF5F3WZSEYG7OFWJD5JY66JKVFE2YQ4GWBP3L7VVASXQLQ",
  }
} as const

export const Errors = {
  1: {message:"CampaignNotFound"},
  2: {message:"ReferralNotFound"},
  3: {message:"NotAuthorized"},
  4: {message:"DuplicateReferral"},
  5: {message:"InsufficientEscrow"},
  6: {message:"ReferralAlreadyPaid"},
  7: {message:"ReferralDisputed"},
  8: {message:"ReferralNotVerified"},
  9: {message:"CampaignNotActive"},
  10: {message:"CampaignMaxReferralsReached"},
  11: {message:"InvalidDisputeState"},
  12: {message:"AlreadyDisputed"}
}

export type DataKey = {tag: "Campaign", values: readonly [u64]} | {tag: "Referral", values: readonly [u64, Buffer]} | {tag: "CampaignCounter", values: void} | {tag: "CampaignReferralIndex", values: readonly [u64]};


export interface Campaign {
  active: boolean;
  asset: string;
  business: string;
  commission_amount: i128;
  escrow_balance: i128;
  id: u64;
  max_referrals: u32;
  referral_count: u32;
}


export interface Referral {
  agent: string;
  campaign_id: u64;
  dispute_in_favor_of_agent: Option<boolean>;
  dispute_resolver: Option<string>;
  disputed: boolean;
  paid: boolean;
  referral_hash: Buffer;
  verified: boolean;
  verifier: Option<string>;
}

export interface Client {
  /**
   * Construct and simulate a get_campaign transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Read campaign state.
   */
  get_campaign: ({campaign_id}: {campaign_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Campaign>>

  /**
   * Construct and simulate a get_referral transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Read referral state.
   */
  get_referral: ({campaign_id, referral_hash}: {campaign_id: u64, referral_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Referral>>

  /**
   * Construct and simulate a open_dispute transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Open a dispute on a referral. Prevents payout.
   */
  open_dispute: ({disputant, campaign_id, referral_hash}: {disputant: string, campaign_id: u64, referral_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a fund_campaign transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Fund a campaign's escrow. Transfers tokens from business to this contract.
   */
  fund_campaign: ({business, campaign_id, amount}: {business: string, campaign_id: u64, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a create_campaign transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Create a new commission campaign. Returns campaign_id.
   */
  create_campaign: ({business, commission_amount, asset, max_referrals}: {business: string, commission_amount: i128, asset: string, max_referrals: u32}, options?: MethodOptions) => Promise<AssembledTransaction<u64>>

  /**
   * Construct and simulate a resolve_dispute transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Admin resolves a dispute. in_favor_of_agent=true means referral confirmed.
   */
  resolve_dispute: ({resolver, campaign_id, referral_hash, in_favor_of_agent}: {resolver: string, campaign_id: u64, referral_hash: Buffer, in_favor_of_agent: boolean}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a submit_referral transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Submit a referral for a campaign. Returns the referral hash for reference.
   */
  submit_referral: ({agent, campaign_id, referral_hash}: {agent: string, campaign_id: u64, referral_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a verify_referral transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Business verifies a referral (confirms off-chain sale).
   */
  verify_referral: ({business, campaign_id, referral_hash}: {business: string, campaign_id: u64, referral_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a claim_commission transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Claim commission payout. Soroban validates all conditions then transfers tokens.
   */
  claim_commission: ({agent, campaign_id, referral_hash}: {agent: string, campaign_id: u64, referral_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_campaign_count transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get total number of campaigns.
   */
  get_campaign_count: (options?: MethodOptions) => Promise<AssembledTransaction<u64>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAADAAAAAAAAAAQQ2FtcGFpZ25Ob3RGb3VuZAAAAAEAAAAAAAAAEFJlZmVycmFsTm90Rm91bmQAAAACAAAAAAAAAA1Ob3RBdXRob3JpemVkAAAAAAAAAwAAAAAAAAARRHVwbGljYXRlUmVmZXJyYWwAAAAAAAAEAAAAAAAAABJJbnN1ZmZpY2llbnRFc2Nyb3cAAAAAAAUAAAAAAAAAE1JlZmVycmFsQWxyZWFkeVBhaWQAAAAABgAAAAAAAAAQUmVmZXJyYWxEaXNwdXRlZAAAAAcAAAAAAAAAE1JlZmVycmFsTm90VmVyaWZpZWQAAAAACAAAAAAAAAARQ2FtcGFpZ25Ob3RBY3RpdmUAAAAAAAAJAAAAAAAAABtDYW1wYWlnbk1heFJlZmVycmFsc1JlYWNoZWQAAAAACgAAAAAAAAATSW52YWxpZERpc3B1dGVTdGF0ZQAAAAALAAAAAAAAAA9BbHJlYWR5RGlzcHV0ZWQAAAAADA==",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABAAAAAEAAAAAAAAACENhbXBhaWduAAAAAQAAAAYAAAABAAAAAAAAAAhSZWZlcnJhbAAAAAIAAAAGAAAADgAAAAAAAAAAAAAAD0NhbXBhaWduQ291bnRlcgAAAAABAAAAAAAAABVDYW1wYWlnblJlZmVycmFsSW5kZXgAAAAAAAABAAAABg==",
        "AAAAAQAAAAAAAAAAAAAACENhbXBhaWduAAAACAAAAAAAAAAGYWN0aXZlAAAAAAABAAAAAAAAAAVhc3NldAAAAAAAABMAAAAAAAAACGJ1c2luZXNzAAAAEwAAAAAAAAARY29tbWlzc2lvbl9hbW91bnQAAAAAAAALAAAAAAAAAA5lc2Nyb3dfYmFsYW5jZQAAAAAACwAAAAAAAAACaWQAAAAAAAYAAAAAAAAADW1heF9yZWZlcnJhbHMAAAAAAAAEAAAAAAAAAA5yZWZlcnJhbF9jb3VudAAAAAAABA==",
        "AAAAAQAAAAAAAAAAAAAACFJlZmVycmFsAAAACQAAAAAAAAAFYWdlbnQAAAAAAAATAAAAAAAAAAtjYW1wYWlnbl9pZAAAAAAGAAAAAAAAABlkaXNwdXRlX2luX2Zhdm9yX29mX2FnZW50AAAAAAAD6AAAAAEAAAAAAAAAEGRpc3B1dGVfcmVzb2x2ZXIAAAPoAAAAEwAAAAAAAAAIZGlzcHV0ZWQAAAABAAAAAAAAAARwYWlkAAAAAQAAAAAAAAANcmVmZXJyYWxfaGFzaAAAAAAAAA4AAAAAAAAACHZlcmlmaWVkAAAAAQAAAAAAAAAIdmVyaWZpZXIAAAPoAAAAEw==",
        "AAAAAAAAABRSZWFkIGNhbXBhaWduIHN0YXRlLgAAAAxnZXRfY2FtcGFpZ24AAAABAAAAAAAAAAtjYW1wYWlnbl9pZAAAAAAGAAAAAQAAB9AAAAAIQ2FtcGFpZ24=",
        "AAAAAAAAABRSZWFkIHJlZmVycmFsIHN0YXRlLgAAAAxnZXRfcmVmZXJyYWwAAAACAAAAAAAAAAtjYW1wYWlnbl9pZAAAAAAGAAAAAAAAAA1yZWZlcnJhbF9oYXNoAAAAAAAADgAAAAEAAAfQAAAACFJlZmVycmFs",
        "AAAAAAAAAC5PcGVuIGEgZGlzcHV0ZSBvbiBhIHJlZmVycmFsLiBQcmV2ZW50cyBwYXlvdXQuAAAAAAAMb3Blbl9kaXNwdXRlAAAAAwAAAAAAAAAJZGlzcHV0YW50AAAAAAAAEwAAAAAAAAALY2FtcGFpZ25faWQAAAAABgAAAAAAAAANcmVmZXJyYWxfaGFzaAAAAAAAAA4AAAAA",
        "AAAAAAAAAEpGdW5kIGEgY2FtcGFpZ24ncyBlc2Nyb3cuIFRyYW5zZmVycyB0b2tlbnMgZnJvbSBidXNpbmVzcyB0byB0aGlzIGNvbnRyYWN0LgAAAAAADWZ1bmRfY2FtcGFpZ24AAAAAAAADAAAAAAAAAAhidXNpbmVzcwAAABMAAAAAAAAAC2NhbXBhaWduX2lkAAAAAAYAAAAAAAAABmFtb3VudAAAAAAACwAAAAA=",
        "AAAAAAAAADZDcmVhdGUgYSBuZXcgY29tbWlzc2lvbiBjYW1wYWlnbi4gUmV0dXJucyBjYW1wYWlnbl9pZC4AAAAAAA9jcmVhdGVfY2FtcGFpZ24AAAAABAAAAAAAAAAIYnVzaW5lc3MAAAATAAAAAAAAABFjb21taXNzaW9uX2Ftb3VudAAAAAAAAAsAAAAAAAAABWFzc2V0AAAAAAAAEwAAAAAAAAANbWF4X3JlZmVycmFscwAAAAAAAAQAAAABAAAABg==",
        "AAAAAAAAAEpBZG1pbiByZXNvbHZlcyBhIGRpc3B1dGUuIGluX2Zhdm9yX29mX2FnZW50PXRydWUgbWVhbnMgcmVmZXJyYWwgY29uZmlybWVkLgAAAAAAD3Jlc29sdmVfZGlzcHV0ZQAAAAAEAAAAAAAAAAhyZXNvbHZlcgAAABMAAAAAAAAAC2NhbXBhaWduX2lkAAAAAAYAAAAAAAAADXJlZmVycmFsX2hhc2gAAAAAAAAOAAAAAAAAABFpbl9mYXZvcl9vZl9hZ2VudAAAAAAAAAEAAAAA",
        "AAAAAAAAAEpTdWJtaXQgYSByZWZlcnJhbCBmb3IgYSBjYW1wYWlnbi4gUmV0dXJucyB0aGUgcmVmZXJyYWwgaGFzaCBmb3IgcmVmZXJlbmNlLgAAAAAAD3N1Ym1pdF9yZWZlcnJhbAAAAAADAAAAAAAAAAVhZ2VudAAAAAAAABMAAAAAAAAAC2NhbXBhaWduX2lkAAAAAAYAAAAAAAAADXJlZmVycmFsX2hhc2gAAAAAAAAOAAAAAA==",
        "AAAAAAAAADdCdXNpbmVzcyB2ZXJpZmllcyBhIHJlZmVycmFsIChjb25maXJtcyBvZmYtY2hhaW4gc2FsZSkuAAAAAA92ZXJpZnlfcmVmZXJyYWwAAAAAAwAAAAAAAAAIYnVzaW5lc3MAAAATAAAAAAAAAAtjYW1wYWlnbl9pZAAAAAAGAAAAAAAAAA1yZWZlcnJhbF9oYXNoAAAAAAAADgAAAAA=",
        "AAAAAAAAAFBDbGFpbSBjb21taXNzaW9uIHBheW91dC4gU29yb2JhbiB2YWxpZGF0ZXMgYWxsIGNvbmRpdGlvbnMgdGhlbiB0cmFuc2ZlcnMgdG9rZW5zLgAAABBjbGFpbV9jb21taXNzaW9uAAAAAwAAAAAAAAAFYWdlbnQAAAAAAAATAAAAAAAAAAtjYW1wYWlnbl9pZAAAAAAGAAAAAAAAAA1yZWZlcnJhbF9oYXNoAAAAAAAADgAAAAA=",
        "AAAAAAAAAB5HZXQgdG90YWwgbnVtYmVyIG9mIGNhbXBhaWducy4AAAAAABJnZXRfY2FtcGFpZ25fY291bnQAAAAAAAAAAAABAAAABg==" ]),
      options
    )
  }
  public readonly fromJSON = {
    get_campaign: this.txFromJSON<Campaign>,
        get_referral: this.txFromJSON<Referral>,
        open_dispute: this.txFromJSON<null>,
        fund_campaign: this.txFromJSON<null>,
        create_campaign: this.txFromJSON<u64>,
        resolve_dispute: this.txFromJSON<null>,
        submit_referral: this.txFromJSON<null>,
        verify_referral: this.txFromJSON<null>,
        claim_commission: this.txFromJSON<null>,
        get_campaign_count: this.txFromJSON<u64>
  }
}