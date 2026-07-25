#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Address, Bytes, Env};

fn create_test_token(env: &Env) -> (Address, token::StellarAssetClient<'_>) {
    let admin = Address::generate(env);
    let token_addr = env.register_stellar_asset_contract(admin.clone());
    let client = token::StellarAssetClient::new(env, &token_addr);
    (token_addr, client)
}

fn setup(env: &Env) -> (Address, Address, Address, Address, u64) {
    let business = Address::generate(env);
    let agent = Address::generate(env);
    let agent2 = Address::generate(env);
    let admin = Address::generate(env);

    let (token_addr, token_admin) = create_test_token(env);

    let contract_id = env.register(CommissionEscrow, ());
    let client = CommissionEscrowClient::new(env, &contract_id);

    // Create campaign
    let campaign_id = client.create_campaign(&business, &100i128, &token_addr, &10);

    // Mint tokens to business for escrow funding
    token_admin.mint(&business, &1000i128);

    // Fund campaign
    client.fund_campaign(&business, &campaign_id, &1000i128);

    (business, agent, agent2, admin, campaign_id)
}

fn make_hash(env: &Env, data: &str) -> Bytes {
    let mut b = Bytes::new(env);
    for byte in data.as_bytes() {
        b.push_back(*byte);
    }
    b
}

#[test]
fn test_happy_path() {
    let env = Env::default();
    env.mock_all_auths();
    let (_business, _agent, _, _, _campaign_id) = setup(&env);

    let client = CommissionEscrowClient::new(&env, &env.register(CommissionEscrow, ()));

    // Actually re-setup with the client's contract
    let (token_addr, token_admin) = create_test_token(&env);
    let business2 = Address::generate(&env);
    let agent2 = Address::generate(&env);

    token_admin.mint(&business2, &500i128);

    let cid = client.create_campaign(&business2, &50i128, &token_addr, &5);
    client.fund_campaign(&business2, &cid, &500i128);

    let hash = make_hash(&env, "client-001");
    client.submit_referral(&agent2, &cid, &hash);

    // Verify referral
    client.verify_referral(&business2, &cid, &hash.clone());

    // Claim commission
    client.claim_commission(&agent2, &cid, &hash.clone());

    // Check final state
    let campaign = client.get_campaign(&cid);
    assert_eq!(campaign.escrow_balance, 450i128);

    let referral = client.get_referral(&cid, &hash.clone());
    assert!(referral.paid);
    assert!(referral.verified);
    assert!(!referral.disputed);
}

#[test]
#[should_panic(expected = "not campaign business")]
fn test_unauthorized_approval() {
    let env = Env::default();
    env.mock_all_auths();

    let business = Address::generate(&env);
    let agent = Address::generate(&env);
    let random_person = Address::generate(&env);

    let (token_addr, token_admin) = create_test_token(&env);
    token_admin.mint(&business, &500i128);

    let contract_id = env.register(CommissionEscrow, ());
    let client = CommissionEscrowClient::new(&env, &contract_id);

    let cid = client.create_campaign(&business, &50i128, &token_addr, &5);
    client.fund_campaign(&business, &cid, &500i128);

    let hash = make_hash(&env, "client-001");
    client.submit_referral(&agent, &cid, &hash);

    // Random person tries to verify — should fail
    client.verify_referral(&random_person, &cid, &hash);
}

#[test]
#[should_panic(expected = "duplicate referral")]
fn test_duplicate_referral() {
    let env = Env::default();
    env.mock_all_auths();

    let business = Address::generate(&env);
    let agent = Address::generate(&env);

    let (token_addr, token_admin) = create_test_token(&env);
    token_admin.mint(&business, &500i128);

    let contract_id = env.register(CommissionEscrow, ());
    let client = CommissionEscrowClient::new(&env, &contract_id);

    let cid = client.create_campaign(&business, &50i128, &token_addr, &5);
    client.fund_campaign(&business, &cid, &500i128);

    let hash = make_hash(&env, "client-001");
    client.submit_referral(&agent, &cid, &hash);

    // Submit same referral again — should fail
    client.submit_referral(&agent, &cid, &hash);
}

#[test]
#[should_panic(expected = "referral is disputed")]
fn test_disputed_referral_cannot_be_paid() {
    let env = Env::default();
    env.mock_all_auths();

    let business = Address::generate(&env);
    let agent = Address::generate(&env);
    let disputant = Address::generate(&env);

    let (token_addr, token_admin) = create_test_token(&env);
    token_admin.mint(&business, &500i128);

    let contract_id = env.register(CommissionEscrow, ());
    let client = CommissionEscrowClient::new(&env, &contract_id);

    let cid = client.create_campaign(&business, &50i128, &token_addr, &5);
    client.fund_campaign(&business, &cid, &500i128);

    let hash = make_hash(&env, "client-001");
    client.submit_referral(&agent, &cid, &hash);
    client.verify_referral(&business, &cid, &hash.clone());

    // Open dispute
    client.open_dispute(&disputant, &cid, &hash.clone());

    // Try to claim — should fail because disputed
    client.claim_commission(&agent, &cid, &hash.clone());
}

#[test]
#[should_panic(expected = "already paid")]
fn test_duplicate_payout() {
    let env = Env::default();
    env.mock_all_auths();

    let business = Address::generate(&env);
    let agent = Address::generate(&env);

    let (token_addr, token_admin) = create_test_token(&env);
    token_admin.mint(&business, &500i128);

    let contract_id = env.register(CommissionEscrow, ());
    let client = CommissionEscrowClient::new(&env, &contract_id);

    let cid = client.create_campaign(&business, &50i128, &token_addr, &5);
    client.fund_campaign(&business, &cid, &500i128);

    let hash = make_hash(&env, "client-001");
    client.submit_referral(&agent, &cid, &hash);
    client.verify_referral(&business, &cid, &hash.clone());

    // First payout
    client.claim_commission(&agent, &cid, &hash.clone());

    // Second payout — should fail
    client.claim_commission(&agent, &cid, &hash.clone());
}

#[test]
#[should_panic(expected = "insufficient escrow")]
fn test_insufficient_escrow() {
    let env = Env::default();
    env.mock_all_auths();

    let business = Address::generate(&env);
    let agent = Address::generate(&env);

    let (token_addr, token_admin) = create_test_token(&env);
    token_admin.mint(&business, &100i128);

    let contract_id = env.register(CommissionEscrow, ());
    let client = CommissionEscrowClient::new(&env, &contract_id);

    let cid = client.create_campaign(&business, &100i128, &token_addr, &5);
    client.fund_campaign(&business, &cid, &100i128);

    // Submit multiple referrals
    let hash1 = make_hash(&env, "client-001");
    client.submit_referral(&agent, &cid, &hash1);
    client.verify_referral(&business, &cid, &hash1.clone());

    // First claim succeeds, drains escrow
    client.claim_commission(&agent, &cid, &hash1.clone());

    let hash2 = make_hash(&env, "client-002");
    let agent2 = Address::generate(&env);
    client.submit_referral(&agent2, &cid, &hash2);
    client.verify_referral(&business, &cid, &hash2.clone());

    // Second claim fails — no escrow left
    client.claim_commission(&agent2, &cid, &hash2.clone());
}

#[test]
fn test_dispute_resolution_in_favor_of_agent() {
    let env = Env::default();
    env.mock_all_auths();

    let business = Address::generate(&env);
    let agent = Address::generate(&env);
    let admin = Address::generate(&env);

    let (token_addr, token_admin) = create_test_token(&env);
    token_admin.mint(&business, &500i128);

    let contract_id = env.register(CommissionEscrow, ());
    let client = CommissionEscrowClient::new(&env, &contract_id);

    let cid = client.create_campaign(&business, &50i128, &token_addr, &5);
    client.fund_campaign(&business, &cid, &500i128);

    let hash = make_hash(&env, "client-001");
    client.submit_referral(&agent, &cid, &hash);
    client.verify_referral(&business, &cid, &hash.clone());

    client.open_dispute(&admin, &cid, &hash.clone());
    client.resolve_dispute(&admin, &cid, &hash.clone(), &true);

    // Agent can now claim
    client.claim_commission(&agent, &cid, &hash.clone());

    let referral = client.get_referral(&cid, &hash.clone());
    assert!(referral.paid);
}

#[test]
fn test_dispute_resolution_against_agent() {
    let env = Env::default();
    env.mock_all_auths();

    let business = Address::generate(&env);
    let agent = Address::generate(&env);
    let admin = Address::generate(&env);

    let (token_addr, token_admin) = create_test_token(&env);
    token_admin.mint(&business, &500i128);

    let contract_id = env.register(CommissionEscrow, ());
    let client = CommissionEscrowClient::new(&env, &contract_id);

    let cid = client.create_campaign(&business, &50i128, &token_addr, &5);
    client.fund_campaign(&business, &cid, &500i128);

    let hash = make_hash(&env, "client-001");
    client.submit_referral(&agent, &cid, &hash);
    client.verify_referral(&business, &cid, &hash.clone());

    client.open_dispute(&admin, &cid, &hash.clone());
    client.resolve_dispute(&admin, &cid, &hash.clone(), &false);

    // Referral is no longer verified, so claim should fail
    let referral = client.get_referral(&cid, &hash.clone());
    assert!(!referral.verified);
}

#[test]
fn test_campaign_count() {
    let env = Env::default();
    env.mock_all_auths();

    let business = Address::generate(&env);
    let (token_addr, _) = create_test_token(&env);

    let contract_id = env.register(CommissionEscrow, ());
    let client = CommissionEscrowClient::new(&env, &contract_id);

    assert_eq!(client.get_campaign_count(), 0);

    client.create_campaign(&business, &50i128, &token_addr, &5);
    assert_eq!(client.get_campaign_count(), 1);

    client.create_campaign(&business, &100i128, &token_addr, &10);
    assert_eq!(client.get_campaign_count(), 2);
}
