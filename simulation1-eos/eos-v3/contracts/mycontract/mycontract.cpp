#include <eosio/eosio.hpp>
#include <eosio/print.hpp>
#include <eosio/asset.hpp>
#include <eosio/system.hpp>

using namespace eosio;

class [[eosio::contract("mycontract")]] mycontract : public eosio::contract {
    private:
        struct [[eosio::table]] disk {
            name key;
            std::string fullname;
            std::string description;
            uint64_t primary_key() const { return key.value; }
        };
        typedef eosio::multi_index<"mystorage"_n, disk> disk_index;
        const symbol token_symbol;
        struct [[eosio::table]] balance {
            eosio::asset funds;
            uint64_t primary_key() const { return funds.symbol.raw(); }
        };

        using balance_table = eosio::multi_index<"balance"_n, balance>;
        
    public:
        using contract::contract;
        mycontract(name receiver, name code, datastream<const char *> ds):contract(receiver, code, ds), token_symbol("SYS", 4){}
        
        [[eosio::on_notify("eosio.token::transfer")]]
        void deposit(name user, name to, eosio::asset quantity, std::string memo)
        {
        if (to != get_self() || user == get_self())
        {
            eosio::print("These are not the droids you are looking for.");
            return;
        }
        check(quantity.amount > 0, "When pigs fly");
        check(quantity.symbol == token_symbol, "NOT MY SYMBOL");

        balance_table balance(get_self(), user.value);
        auto token_it = balance.find(token_symbol.raw());

        if (token_it != balance.end())
            balance.modify(token_it, get_self(), [&](auto &row) {
            row.funds += quantity;
            });
        else
            balance.emplace(get_self(), [&](auto &row) {
            row.funds = quantity;
            });
        }


        [[eosio::action]]
        void withdraw(name user, double q)
        {
        //Check the authority of user
        require_auth(user);
        eosio::asset quantity;
        quantity.amount = q;
        quantity.symbol = token_symbol;
        balance_table balance(get_self(), user.value);
        auto token_it = balance.find(token_symbol.raw());

        //Make sure the holder is in the table
        check(token_it != balance.end(), "You're not allowed to withdraw");
        //Make sure the holder balance is larger than quantity
        check(token_it->funds.amount >= quantity.amount, "Quantity larger than balance");


        action{
            permission_level{get_self(), "active"_n},
            "eosio.token"_n,
            "transfer"_n,
            std::make_tuple(get_self(), user, quantity, std::string("Winthdrawn!"))
        }.send();

        balance.modify(token_it, get_self(), [&](auto &row) {
            row.funds -= quantity;
            });
            eosio::print(token_it->funds.amount);
        }


        [[eosio::action]]
        void readbalance(name user)
        {
        //Check the authority of user
        require_auth(user); 
        balance_table balance(get_self(), user.value);
        auto token_it = balance.find(token_symbol.raw());

        //Make sure the holder is in the table
        check(token_it != balance.end(), "YOU DID NOT DEPOSIT");
        eosio::print(token_it->funds);
        }

        [[eosio::action]]
        void storein(name user, std::string fullname, std::string description) {
            require_auth( user );
            disk_index mystorage( get_self(), get_first_receiver().value );
            auto iterator = mystorage.find(user.value);
            if( iterator == mystorage.end() )
            {
            mystorage.emplace(user, [&]( auto& row ) {
            row.key = user;
            row.fullname = fullname;
            row.description = description;
            });
            }
            else {
            mystorage.modify(iterator, user, [&]( auto& row ) {
                row.key = user;
                row.fullname = fullname;
                row.description = description;
            });
            }
        }


        [[eosio::action]]
        void readtablerow(name user) {
            disk_index mystorage( get_self(), get_first_receiver().value );
            auto iterator = mystorage.find(user.value);
            check(iterator != mystorage.end(), "Record does not exist");
            eosio::print(iterator->key," ",iterator->fullname, " ", iterator->description);
        }
};