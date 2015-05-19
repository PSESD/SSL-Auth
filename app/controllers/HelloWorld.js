var HelloWorld = {
	
	index: function(req, res){
		res.json({ "test": "Hallo World"});
	}
};

module.exports = HelloWorld;