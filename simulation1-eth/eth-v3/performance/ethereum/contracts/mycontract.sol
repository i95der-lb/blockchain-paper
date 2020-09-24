pragma solidity ^0.4.25;

contract MyContract {
    
    struct Disk {
        address sender;
        string name;
        string description;
        bool exists;
    }
    
    address public creator;
    mapping(address => uint) public money;
    Disk[] public mystorage;
    uint256 myindex = 0;
    mapping(address => uint256) indexes;
    
    constructor () public payable{
        creator = msg.sender;
        money[creator] = msg.value;
    }
    
    function depositInContract() payable public{
        if(money[msg.sender] > 0 ) {
            money[msg.sender] += msg.value;
        }
        else {
            money[msg.sender] = msg.value;
        }
        
    }
    
    function withdrawFromContract(uint v) public payable{
        if(money[msg.sender] > msg.value && msg.value < address(this).balance) {
            money[msg.sender] -= v;
            msg.sender.transfer(v);
        }
        
    }
    
    function mybalance() public view returns(uint) {
        return address(this).balance;
    }
    
   function readBalanceDepositedInContract(address a) public view returns(uint) {
       return money[a];
   }
   
   
    function storeInContract(address sender, string memory name, string memory description) public {
        
        Disk memory newStore = Disk({
            sender: sender,
            name: name,
            description: description,
            exists: true
        });
        
        mystorage.push(newStore);
        indexes[sender] = myindex;
        myindex = myindex + 1;
    }
    
    function readFromContract(address y) public view returns(address, string memory, string memory) {
            uint256 x = indexes[y];
            require(mystorage[x].exists);
            return (
                mystorage[x].sender,
                mystorage[x].name,
                mystorage[x].description
                );
    }
    

}