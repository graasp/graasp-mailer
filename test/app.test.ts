import { v4 } from 'uuid';
import build from './app';
import plugin from '../src/index';
import { Member } from 'graasp';
import util from 'util';
import englishTranslations from '../src/lang/en.json';
import frenchTranslations from '../src/lang/fr.json';
import { DEFAULT_EXPORT_ACTIONS_VALIDITY_IN_DAYS } from '../src/constants';

const buildMember = (lang?: string) =>
  ({
    id: v4(),
    name: 'name',
    extra: { lang },
    email: 'email',
  } as unknown as Member);

const DEFAULT_LINK = 'link';
const DEFAULT_RE_REGISTRATION_ATTEMPT = false;
const itemName = 'my-item-name';
const creatorName = 'my-creator-name';

type Translations = { [key: string]: string };

// WARNING: might break if promisify is used once more for another function
const setupValidateSendMail = (
  translations: Translations,
  keyToCheck: string,
  elements?: string[],
) => {
  jest.spyOn(util, 'promisify').mockImplementation(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (d: any) => {
      // check one translation
      expect(d.html).toContain(
        translations[keyToCheck]
          // TODO: handle better html parsing
          // parse \' in case of french
          .replace("'", '&#39;'),
      );
      elements?.forEach((s) => {
        expect(d.html).toContain(s);
      });
    };
  });
};

const setupValidateSendLoginMail = (t: Translations) => setupValidateSendMail(t, 'magiclink');
const setupValidateSendRegisterMail = (t: Translations) => setupValidateSendMail(t, 'greetings');
const setupValidateSendInvitationMail = (t: Translations, elements: string[]) =>
  setupValidateSendMail(t, 'register', elements);
const setupValidateSendExportActionEmail = (t: Translations, elements: string[]) =>
  setupValidateSendMail(t, 'download', elements);

describe('Plugin Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Decorate fastify with mailer functions', async () => {
    const app = await build({ plugin });

    expect(app.mailer).toBeTruthy();
  });

  describe('sendLoginEmail', () => {
    it('Send login mail with default lang', async () => {
      setupValidateSendLoginMail(englishTranslations);

      const app = await build({ plugin });
      app.mailer.sendLoginEmail(buildMember(), DEFAULT_LINK);
    });

    it('Send login mail with given lang', async () => {
      const lang = 'fr';
      setupValidateSendLoginMail(frenchTranslations);

      const app = await build({ plugin });
      app.mailer.sendLoginEmail(
        buildMember(lang),
        DEFAULT_LINK,
        DEFAULT_RE_REGISTRATION_ATTEMPT,
        lang,
      );
    });

    it('Send login mail with default lang if given lang is not available', async () => {
      const lang = 'not-valid';
      setupValidateSendLoginMail(englishTranslations);

      const app = await build({ plugin });
      app.mailer.sendLoginEmail(
        buildMember(lang),
        DEFAULT_LINK,
        DEFAULT_RE_REGISTRATION_ATTEMPT,
        lang,
      );
    });
  });

  describe('sendRegisterEmail', () => {
    it('Send register mail with default lang', async () => {
      setupValidateSendRegisterMail(englishTranslations);

      const app = await build({ plugin });
      app.mailer.sendRegisterEmail(buildMember(), DEFAULT_LINK);
    });

    it('Send register mail with given lang', async () => {
      const lang = 'fr';
      setupValidateSendRegisterMail(frenchTranslations);

      const app = await build({ plugin });
      app.mailer.sendRegisterEmail(buildMember(lang), DEFAULT_LINK, lang);
    });

    it('Send register mail with default lang if given lang is not available', async () => {
      const lang = 'not-valid';
      setupValidateSendRegisterMail(englishTranslations);

      const app = await build({ plugin });
      app.mailer.sendRegisterEmail(buildMember(lang), DEFAULT_LINK, lang);
    });
  });

  describe('sendExportActionsEmail', () => {
    it('Send export actions mail with default values', async () => {
      setupValidateSendExportActionEmail(englishTranslations, [
        itemName,
        `${DEFAULT_EXPORT_ACTIONS_VALIDITY_IN_DAYS} days`,
      ]);

      const app = await build({ plugin });
      app.mailer.sendExportActionsEmail(buildMember(), DEFAULT_LINK, itemName);
    });

    it('Send export actions mail with given values', async () => {
      const lang = 'fr';
      const expirationDays = 3;
      setupValidateSendExportActionEmail(frenchTranslations, [itemName, `${expirationDays} jours`]);

      const app = await build({ plugin });
      app.mailer.sendExportActionsEmail(
        buildMember(lang),
        DEFAULT_LINK,
        itemName,
        lang,
        expirationDays,
      );
    });

    it('Send export actions mail with default lang if given lang is not available', async () => {
      const lang = 'not-valid';
      setupValidateSendExportActionEmail(englishTranslations, [itemName]);

      const app = await build({ plugin });
      app.mailer.sendExportActionsEmail(buildMember(lang), DEFAULT_LINK, itemName, lang);
    });
  });

  describe('sendInvitationEmail', () => {
    const email = 'myemail';
    it('Send invitation mail with default values', async () => {
      setupValidateSendInvitationMail(englishTranslations, [itemName, creatorName]);

      const app = await build({ plugin });
      app.mailer.sendInvitationEmail(email, DEFAULT_LINK, itemName, creatorName);
    });

    it('Send invitation mail with given values', async () => {
      const lang = 'fr';
      setupValidateSendInvitationMail(frenchTranslations, [itemName, creatorName]);

      const app = await build({ plugin });
      app.mailer.sendInvitationEmail(email, DEFAULT_LINK, itemName, creatorName, lang);
    });

    it('Send invitation mail with default lang if given lang is not available', async () => {
      const lang = 'not-valid';
      setupValidateSendInvitationMail(englishTranslations, [itemName]);

      const app = await build({ plugin });
      app.mailer.sendInvitationEmail(email, DEFAULT_LINK, itemName, creatorName, lang);
    });
  });
});
