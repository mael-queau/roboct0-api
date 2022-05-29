"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)({ mergeParams: true });
exports.default = router;
const channels_1 = __importDefault(require("./channels"));
router.use("/channels", channels_1.default);
