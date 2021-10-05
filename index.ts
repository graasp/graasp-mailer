import { promisify } from 'util';

import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

import pointOfView from 'point-of-view';
import * as eta from 'eta';

import { Member } from 'graasp';

import en from './lang/en.json';
import fr from './lang/fr.json';

import i18n from 'i18next';

declare module 'fastify' {
  interface FastifyInstance {
    // remove once fastify-nodemailer has types
    nodemailer: any;
    // remove once point-of-view has the types fixed
    view: any;
    mailer: {
      sendRegisterEmail: (member: Member, link: string) => Promise<void>
      sendLoginEmail: (member: Member, link: string, reRegistrationAttempt?: boolean) => Promise<void>
    };
  }
}

interface MailerOptions {
  host: string,
  username: string,
  password: string,
  fromEmail: string
}

const plugin: FastifyPluginAsync<MailerOptions> = async (fastify, options) => {
  const {
    host,
    username: user,
    password: pass,
    fromEmail
  } = options;

  fastify.register(pointOfView, { engine: { eta } });

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  await fastify.register(require('fastify-nodemailer'), {
    host,
    auth: { user, pass },
    pool: true,
    port: 465,
    secure: true
  });

  i18n.init({
    resources: {
      en,
      fr,
    },
    lng: 'en',
    fallbackLng: 'en',
    // debug only when not in production
    debug: process.env.NODE_ENV !== 'production',
    ns: ['translations'],
    defaultNS: 'translations',
    keySeparator: false,
    interpolation: {
      escapeValue: false,
      formatSeparator: ',',
    },
    react: {
      wait: true,
    },
  });

  const promisifiedNodemailerSendMail =
    // sendMail() uses 'this' internally and 'promisify' breaks that, so it needs to be passed
    promisify(fastify.nodemailer.sendMail.bind(fastify.nodemailer));

  async function sendMail(from: string, to: string, subject: string, text: string, html?: string) {
    // TODO: does it make sense to return the return value of nodemailer?
    await promisifiedNodemailerSendMail({ from, to, subject, text, html });
  }

  const modulePath = module.path;

  // Login
  async function sendLoginEmail(member: { email: string; name: string }, link: string, reRegistrationAttempt = false, lang = 'en' ) {
    const translated = await i18n.changeLanguage(lang);
    const html = await fastify.view(`${modulePath}/templates/login.eta`, { member, link, reRegistrationAttempt, translated });
    await sendMail(fromEmail, member.email, 'Sign in', link, html);
  }

  // Register
  async function sendRegisterEmail(member: { email: string; name: string }, link: string, lang = 'en') {
    const translated = await i18n.changeLanguage(lang);
    const html = await fastify.view(`${modulePath}/templates/register.eta`, { member, link, translated });
    await sendMail(fromEmail, member.email, 'Register', link, html);
  }

  fastify.decorate('mailer', {
    sendLoginEmail,
    sendRegisterEmail
  });
};

export default fp(plugin, {
  fastify: '3.x',
  name: 'graasp-mailer'
});
