/**
 * This class contains all the Enum values
 */
define([], function() {
   	return {
		/**
		 * Meta for an control's property: as some Aggregation can use the alternate type, then it is a property
		 */
		MetaType: {
			Prop: "Prop",
			Asso: "Asso",
			Event:"Event",
			Aggr:   "Aggr",
			Unknown: "Unknown" 
		},

		/**
		 * The XML view Control Node type
		 * @type {Object}
		 */
		NodeType: {
				Root:"Root",
				Html:"Html",  //the html control, such as h1
				Ui5: "Ui5",   //the ui5 control, sap.m.Button
				Aggr:"Aggr",   //the aggregation, such as"content" for a Page
				Template: 'Template',  //the xml template, now can't support it
				Unknown: "Unknown" 
		},

		CheckPoint: {
			Deprecated: "Deprecated",
			DuplicateId: "DuplicateId",
			Binding:  "Binding"
		},

		/**
		 * Some common string constants
		 */
		StrControl : "sap.ui.core.Control",
		StrElement:  "sap.ui.core.Element",
		StrCoreView:  "sap.ui.core.View",
		StrFragment:  "sp.ui.core.Fragment",
		StrFragmentDefinition :"sp.ui.core.FragmentDefinition",
		StrExtPoint 	:"sp.ui.core.ExtensionPoint",
		StrManagedObject: "sap.ui.base.ManagedObject"
}
});
