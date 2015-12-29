/*global define*/
define([
	"../config/Config",
	"../utils/XmlViewReader",
	"../utils/Ui5MetadataMng",
], function(Config, XmlViewReader, Ui5MetadataMng) {
	"use strict";
	
	function createReport() { return { "root": {}, "issues": [] }; }
	
	return {
		init: function() {

		},

		//get the UI5 version and library information, then use it to get the metadata
		getProjectUi5LibraryInfor: function() {
		    
/*		    this.context.service.content.getCurrentDocument().then(function(oDocument) {
                //Get current project dependencies, including ui5 version
                return that.context.service.projectmetadata.getDependencies(oDocument);     
			})
*/		    
			return Q({version: '1.29'});
		},
		
		getIssues: function(sSource, oConfig, sFullPath) {
			var returnPromise = Q.defer();
			var oPromise = this.getProjectUi5LibraryInfor();

			oPromise.then( 
				function( libInfo ) {
			    	return Ui5MetadataMng.loadMetadata(libInfo);
				},
				function( error ) {
				    returnPromise.reject(error);
				}
			).then( 
				function( versionMetadata ) {
			        return XmlViewReader.validateXml(sSource, versionMetadata, oConfig);
			    },
			    function( error ) {
				    returnPromise.reject(error);
				}
			).then( 
				function( issueInfo ) {
			        returnPromise.resolve(issueInfo); 
			    },
			    function( error ) {
				    returnPromise.reject(error);
				}
			);

			return returnPromise.promise;
		},

		getIssuesSynchronously: function(sSource, oConfig, sFullPath) {
			return this.getIssues(sSource, oConfig, sFullPath);
		},

		getPathToImplementationModule: function() {
			return "sap/watt/saptoolsets/fiori/editor/plugin/xmlsemanticcheck/XmlSemanticCheck";
		},

		/* is called on every lint process */
		getCustomRulesContent: function(/*path*/) {
			return {};
		},

		convertRulesToDisplayFormat: function(/*rules*/) {
			var result = [];
			/*{
				"ruleId": "new-cap",
				"severity": "info",
				"enable": "false",
				"category": "Stylistic Issue",
				"helpUrl": "http://eslint.org/docs/rules/new-cap"
			}*/
			return result;
		},
		convertRulesToConcreteFormat: function() {
			return [];
		},

		/* result is used in getIssues */
		/* is called on every lint process */
		getConfiguration: function(aFilters/*, defConfig, projConfig*/) {
			return {
				"show": aFilters,
				"rules": {}
			};
		},
		/* default configuration, is provided to the getConfiguration method */
		/* is called on plugin initial load */
		getDefaultConfiguration: function(/*customRulesPath*/) {
			return null;
		}
	};
});