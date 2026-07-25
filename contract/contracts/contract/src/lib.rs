#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Bytes, Env, Symbol, token};


#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    CampaignNotFound = 1,
    ReferralNotFound = 2,
    NotAuthorized = 3,
    DuplicateReferral = 4,
    InsufficientEscrow = 5,
    ReferralAlreadyPaid = 6,
    ReferralDisputed = 7,
    ReferralNotVerified = 8,
    CampaignNotActive = 9,
    CampaignMaxReferralsReached = 10,
    InvalidDisputeState = 11,
    AlreadyDisputed = 12,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Campaign {
    pub id: u64,
    pub business: Address,
    pub commission_amount: i128,
    pub asset: Address,
    pub escrow_balance: i128,
    pub max_referrals: u32,
    pub referral_count: u32,
    pub active: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Referral {
    pub campaign_id: u64,
    pub agent: Address,
    pub referral_hash: Bytes,
    pub verified: bool,
    pub disputed: bool,
    pub paid: bool,
    pub verifier: Option<Address>,
    pub dispute_resolver: Option<Address>,
    pub dispute_in_favor_of_agent: Option<bool>,
}

#[contracttype]
pub enum DataKey {
    Campaign(u64),
    Referral(u64, Bytes),
    CampaignCounter,
    CampaignReferralIndex(u64),
}

fn make_referral_key(campaign_id: u64, referral_hash: &Bytes) -> DataKey {
    DataKey::Referral(campaign_id, referral_hash.clone())
}

#[contract]
pub struct CommissionEscrow;

#[contractimpl]
impl CommissionEscrow {
    /// Create a new commission campaign. Returns campaign_id.
    pub fn create_campaign(
        env: Env,
        business: Address,
        commission_amount: i128,
        asset: Address,
        max_referrals: u32,
    ) -> u64 {
        business.require_auth();
        assert!(commission_amount > 0, "commission must be positive");
        assert!(max_referrals > 0, "max_referrals must be positive");

        let counter: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::CampaignCounter)
            .unwrap_or(0u64);
        let new_id = counter + 1;

        let campaign = Campaign {
            id: new_id,
            business: business.clone(),
            commission_amount,
            asset: asset.clone(),
            escrow_balance: 0,
            max_referrals,
            referral_count: 0,
            active: false,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Campaign(new_id), &campaign);
        env.storage()
            .persistent()
            .set(&DataKey::CampaignCounter, &new_id);

        env.events().publish(
            (Symbol::new(&env, "campaign_created"),),
            (new_id, business, commission_amount),
        );

        new_id
    }

    /// Fund a campaign's escrow. Transfers tokens from business to this contract.
    pub fn fund_campaign(env: Env, business: Address, campaign_id: u64, amount: i128) {
        business.require_auth();
        assert!(amount > 0, "amount must be positive");

        let mut campaign: Campaign = env
            .storage()
            .persistent()
            .get(&DataKey::Campaign(campaign_id))
            .expect("campaign not found");

        assert!(campaign.business == business, "not campaign business");
        assert!(!campaign.active, "campaign already active");

        // Transfer tokens from business to contract
        token::Client::new(&env, &campaign.asset).transfer(
            &business,
            &env.current_contract_address(),
            &amount,
        );

        campaign.escrow_balance += amount;
        campaign.active = true;

        env.storage()
            .persistent()
            .set(&DataKey::Campaign(campaign_id), &campaign);

        env.events().publish(
            (Symbol::new(&env, "campaign_funded"),),
            (campaign_id, amount, campaign.escrow_balance),
        );
    }

    /// Submit a referral for a campaign. Returns the referral hash for reference.
    pub fn submit_referral(
        env: Env,
        agent: Address,
        campaign_id: u64,
        referral_hash: Bytes,
    ) {
        agent.require_auth();

        let mut campaign: Campaign = env
            .storage()
            .persistent()
            .get(&DataKey::Campaign(campaign_id))
            .expect("campaign not found");

        assert!(campaign.active, "campaign not active");
        assert!(
            campaign.referral_count < campaign.max_referrals,
            "max referrals reached"
        );

        let key = make_referral_key(campaign_id, &referral_hash);
        assert!(
            !env.storage().persistent().has(&key),
            "duplicate referral"
        );

        let referral = Referral {
            campaign_id,
            agent: agent.clone(),
            referral_hash: referral_hash.clone(),
            verified: false,
            disputed: false,
            paid: false,
            verifier: None,
            dispute_resolver: None,
            dispute_in_favor_of_agent: None,
        };

        env.storage().persistent().set(&key, &referral);
        campaign.referral_count += 1;
        env.storage()
            .persistent()
            .set(&DataKey::Campaign(campaign_id), &campaign);

        env.events().publish(
            (Symbol::new(&env, "referral_submitted"),),
            (campaign_id, agent, referral_hash),
        );
    }

    /// Business verifies a referral (confirms off-chain sale).
    pub fn verify_referral(
        env: Env,
        business: Address,
        campaign_id: u64,
        referral_hash: Bytes,
    ) {
        business.require_auth();

        let campaign: Campaign = env
            .storage()
            .persistent()
            .get(&DataKey::Campaign(campaign_id))
            .expect("campaign not found");
        assert!(campaign.business == business, "not campaign business");

        let key = make_referral_key(campaign_id, &referral_hash);
        let mut referral: Referral = env
            .storage()
            .persistent()
            .get(&key)
            .expect("referral not found");

        assert!(!referral.verified, "already verified");
        assert!(!referral.paid, "already paid");
        assert!(!referral.disputed, "cannot verify disputed referral");

        referral.verified = true;
        referral.verifier = Some(business.clone());

        env.storage().persistent().set(&key, &referral);

        env.events().publish(
            (Symbol::new(&env, "referral_verified"),),
            (campaign_id, referral_hash, business),
        );
    }

    /// Open a dispute on a referral. Prevents payout.
    pub fn open_dispute(
        env: Env,
        disputant: Address,
        campaign_id: u64,
        referral_hash: Bytes,
    ) {
        disputant.require_auth();

        let key = make_referral_key(campaign_id, &referral_hash);
        let mut referral: Referral = env
            .storage()
            .persistent()
            .get(&key)
            .expect("referral not found");

        assert!(!referral.disputed, "already disputed");
        assert!(!referral.paid, "cannot dispute paid referral");

        referral.disputed = true;

        env.storage().persistent().set(&key, &referral);

        env.events().publish(
            (Symbol::new(&env, "dispute_opened"),),
            (campaign_id, referral_hash, disputant),
        );
    }

    /// Admin resolves a dispute. in_favor_of_agent=true means referral confirmed.
    pub fn resolve_dispute(
        env: Env,
        resolver: Address,
        campaign_id: u64,
        referral_hash: Bytes,
        in_favor_of_agent: bool,
    ) {
        resolver.require_auth();

        let key = make_referral_key(campaign_id, &referral_hash);
        let mut referral: Referral = env
            .storage()
            .persistent()
            .get(&key)
            .expect("referral not found");

        assert!(referral.disputed, "no active dispute");

        referral.disputed = false;
        referral.dispute_resolver = Some(resolver.clone());
        referral.dispute_in_favor_of_agent = Some(in_favor_of_agent);

        if !in_favor_of_agent {
            referral.verified = false;
        }

        env.storage().persistent().set(&key, &referral);

        env.events().publish(
            (Symbol::new(&env, "dispute_resolved"),),
            (campaign_id, referral_hash, resolver, in_favor_of_agent),
        );
    }

    /// Claim commission payout. Soroban validates all conditions then transfers tokens.
    pub fn claim_commission(
        env: Env,
        agent: Address,
        campaign_id: u64,
        referral_hash: Bytes,
    ) {
        agent.require_auth();

        let campaign: Campaign = env
            .storage()
            .persistent()
            .get(&DataKey::Campaign(campaign_id))
            .expect("campaign not found");

        let key = make_referral_key(campaign_id, &referral_hash);
        let mut referral: Referral = env
            .storage()
            .persistent()
            .get(&key)
            .expect("referral not found");

        // Validation rules
        assert!(referral.agent == agent, "not referral owner");
        assert!(referral.verified, "referral not verified");
        assert!(!referral.paid, "already paid");
        assert!(!referral.disputed, "referral is disputed");
        assert!(campaign.active, "campaign not active");
        assert!(
            campaign.escrow_balance >= campaign.commission_amount,
            "insufficient escrow"
        );

        // Transfer commission from contract to agent
        token::Client::new(&env, &campaign.asset).transfer(
            &env.current_contract_address(),
            &agent,
            &campaign.commission_amount,
        );

        // Update state
        referral.paid = true;
        let mut updated_campaign = campaign;
        updated_campaign.escrow_balance -= updated_campaign.commission_amount;

        env.storage().persistent().set(&key, &referral);
        env.storage()
            .persistent()
            .set(&DataKey::Campaign(campaign_id), &updated_campaign);

        env.events().publish(
            (Symbol::new(&env, "commission_paid"),),
            (campaign_id, referral_hash, agent, updated_campaign.commission_amount),
        );
    }

    /// Read campaign state.
    pub fn get_campaign(env: Env, campaign_id: u64) -> Campaign {
        env.storage()
            .persistent()
            .get(&DataKey::Campaign(campaign_id))
            .expect("campaign not found")
    }

    /// Read referral state.
    pub fn get_referral(env: Env, campaign_id: u64, referral_hash: Bytes) -> Referral {
        let key = make_referral_key(campaign_id, &referral_hash);
        env.storage()
            .persistent()
            .get(&key)
            .expect("referral not found")
    }

    /// Get total number of campaigns.
    pub fn get_campaign_count(env: Env) -> u64 {
        env.storage()
            .persistent()
            .get(&DataKey::CampaignCounter)
            .unwrap_or(0u64)
    }
}

mod test;
