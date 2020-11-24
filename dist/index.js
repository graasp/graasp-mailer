"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const point_of_view_1 = __importDefault(require("point-of-view"));
const eta = __importStar(require("eta"));
const plugin = (fastify, options) => __awaiter(void 0, void 0, void 0, function* () {
    const { host, username: user, password: pass, fromEmail } = options;
    fastify.register(point_of_view_1.default, { engine: { eta } });
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    yield fastify.register(require('fastify-nodemailer'), {
        host,
        auth: { user, pass },
        pool: true,
        port: 465,
        secure: true
    });
    const promisifiedNodemailerSendMail = 
    // sendMail() uses 'this' internally and 'promisify' breaks that, so it needs to be passed
    util_1.promisify(fastify.nodemailer.sendMail.bind(fastify.nodemailer));
    function sendMail(from, to, subject, text, html) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: does it make sense to return the return value of nodemailer?
            yield promisifiedNodemailerSendMail({ from, to, subject, text, html });
        });
    }
    const modulePath = module.path;
    // Login
    function sendLoginEmail(member, link) {
        return __awaiter(this, void 0, void 0, function* () {
            const html = yield fastify.view(`${modulePath}/templates/login.eta`, { member, link });
            yield sendMail(fromEmail, member.email, 'Sign in', link, html);
        });
    }
    // Register
    function sendRegisterEmail(member, link) {
        return __awaiter(this, void 0, void 0, function* () {
            const html = yield fastify.view(`${modulePath}/templates/register.eta`, { member, link });
            yield sendMail(fromEmail, member.email, 'Register', link, html);
        });
    }
    fastify.decorate('mailer', {
        sendLoginEmail,
        sendRegisterEmail
    });
});
exports.default = fastify_plugin_1.default(plugin, {
    fastify: '3.x',
    name: 'graasp-mailer'
});
