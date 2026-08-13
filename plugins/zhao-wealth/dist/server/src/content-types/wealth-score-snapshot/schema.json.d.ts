declare const _default: {
  "kind": "collectionType",
  "collectionName": "wealth_score_snapshots",
  "info": {
    "singularName": "wealth-score-snapshot",
    "pluralName": "wealth-score-snapshots",
    "displayName": "评分快照",
    "description": "产品综合评分快照（收益/波动/回撤/同类排名加权）"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "product": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-wealth.wealth-product",
      "inversedBy": "scoreSnapshots"
    },
    "snapshotDate": {
      "type": "date",
      "required": true
    },
    "period": {
      "type": "enumeration",
      "enum": ["m1", "m3", "m6", "y1"],
      "required": true
    },
    "compositeScore": {
      "type": "decimal",
      "precision": 5,
      "scale": 2,
      "required": true
    },
    "starRating": {
      "type": "integer",
      "default": 1
    },
    "returnScore": {
      "type": "decimal",
      "precision": 5,
      "scale": 2
    },
    "volatilityScore": {
      "type": "decimal",
      "precision": 5,
      "scale": 2
    },
    "drawdownScore": {
      "type": "decimal",
      "precision": 5,
      "scale": 2
    },
    "peerRankScore": {
      "type": "decimal",
      "precision": 5,
      "scale": 2
    },
    "weightProfile": {
      "type": "string"
    },
    "createdAt": { "type": "datetime" },
    "updatedAt": { "type": "datetime" }
  }
}
;

export default _default;
