/*global define*/
define(["../utils/EnumValue"],  function(EnumValue) {

	//here  the name must  be same as Enum :
	//  CheckPoint: {
	// 		Deprecated: "Deprecated",
	// 		DuplicateId: "DuplicateId",
	// 		Binding:  "Binding"
	// 	},

    var _mCheckConfig = {
		Deprecated: true,   //whether check all the deprecated:  class, property, event, association, aggregation
		DuplicateId: true, 
		Binding:     true,  //whether check the binding path 
	};

	//!! the special aggregation node list
	//!!now there are some controls which implemented itself logic for Aggr, for example the 
	// sap.m.SemanticPage.prototype.addCustomFooterContent , then it means even the customFooterContent type is sap.m.Button
	// but now it can add all the controls, for this case just maintain the list in the configure and simpleignore it 
	var  aSpecialAggrNode = ['customFooterContent'];

	return {
		setCheckPoint: function(checkPoint, flag) {
		    _mCheckConfig[ checkPoint ] = flag;
		},

		isCheckPointEnabled: function( checkPoint ) {
		    return _mCheckConfig[ checkPoint ];
		},

		isSpecialAggregationNode: function( nodeName ) {
		    return aSpecialAggrNode.indexOf(nodeName) != -1;
		},
		
		
	}

});

	