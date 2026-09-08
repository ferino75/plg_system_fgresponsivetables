<?php

/**
 * @package     Joomla.Plugin
 * @subpackage  System.fgresponsivetables
 *
 * @copyright   (C) 2026 Fero
 * @license     GNU General Public License version 2 or later
 */

declare(strict_types=1);

namespace FG\Plugin\System\Fgresponsivetables\Extension;

defined('_JEXEC') or die;

use Joomla\CMS\Document\HtmlDocument;
use Joomla\CMS\Language\Text;
use Joomla\CMS\Plugin\CMSPlugin;
use Joomla\Event\SubscriberInterface;

/**
 * Loads responsive-table CSS/JS on the site frontend.
 *
 * @since  1.0.0
 */
final class Fgresponsivetables extends CMSPlugin implements SubscriberInterface
{
    /**
     * {@inheritdoc}
     *
     * @return  array<string, string>
     *
     * @since   1.0.0
     */
    public static function getSubscribedEvents(): array
    {
        return [
            'onBeforeCompileHead' => 'onBeforeCompileHead',
        ];
    }

    /**
     * Register and use the plugin assets on HTML site pages.
     *
     * @return  void
     *
     * @since   1.0.0
     */
    public function onBeforeCompileHead(): void
    {
        $app = $this->getApplication();

        if (!$app->isClient('site')) {
            return;
        }

        // Off by default (loads everywhere, matching prior versions) since a
        // table this plugin should style can live outside com_content too —
        // a module, another component's output, a custom layout. Turning
        // this on is a real, measurable win on a content-heavy site (skips
        // ~10KB of CSS/JS in <head> on every page that has no table at
        // all), at the cost of the plugin doing nothing anywhere else.
        if ((int) $this->params->get('load_only_com_content', 0) === 1) {
            $option = $app->input->getCmd('option', '');

            if ($option !== 'com_content') {
                return;
            }
        }

        $document = $app->getDocument();

        if (!$document instanceof HtmlDocument) {
            return;
        }

        $wa = $document->getWebAssetManager();
        $wa->getRegistry()->addExtensionRegistryFile('plg_system_fgresponsivetables');
        $wa->useStyle('plg_system_fgresponsivetables.tables')
            ->useScript('plg_system_fgresponsivetables.tables-script');

        if ((int) $this->params->get('load_legacy', 1) === 1) {
            $wa->useStyle('plg_system_fgresponsivetables.legacy');
        }

        $appearanceCss = $this->buildAppearanceOverrideCss();

        if ($appearanceCss !== '') {
            $document->addStyleDeclaration($appearanceCss);
        }

        // Plugin language files are installed under administrator/language
        // regardless of client (Installer::parseLanguages() is called with
        // client id 1 for plugins), and $autoloadLanguage was removed in
        // 2.0.0 as unused — so on the frontend nothing loads this plugin's
        // strings automatically. Any text the JS needs to show the user has
        // to be resolved here, with an explicit loadLanguage() call, and
        // handed over via addScriptOptions; Text::_() alone would silently
        // return the raw language key on the frontend without this.
        $this->loadLanguage();

        $document->addScriptOptions('plg_system_fgresponsivetables', [
            'selector'    => (string) $this->params->get('selector', 'table.responsiv'),
            'autoLabels'  => (int) $this->params->get('auto_labels', 1) === 1,
            'autoClass'   => (int) $this->params->get('auto_class', 0) === 1,
            'autoClassSelector' => (string) $this->params->get(
                'auto_class_selector',
                'article table, .com-content table, .item-page table, .blog table, .category table'
            ),
            'wrap'        => (int) $this->params->get('wrap', 1) === 1,
            'breakpoint'  => (int) $this->params->get('breakpoint', 600),
            'ariaRoles'   => (int) $this->params->get('aria_roles', 1) === 1,
            'cardStyle'   => (string) $this->params->get('card_style', 'card'),
            'clearFloats' => (int) $this->params->get('clear_floats', 0) === 1,
            'minWidth'    => (int) $this->params->get('min_width', 0),
            'scrollLabel' => Text::_('PLG_SYSTEM_FGRESPONSIVETABLES_SCROLL_REGION'),
            'watchDom'    => (int) $this->params->get('watch_dom', 0) === 1,
            'multiLevelLabels'    => (int) $this->params->get('multi_level_labels', 0) === 1,
            'multiLevelSeparator' => (string) $this->params->get('multi_level_separator', ' › '),
            'exclude'     => (string) $this->params->get('exclude', 'table.no-responsiv, .no-responsiv table'),
        ]);
    }

    /**
     * Builds a :root{...} declaration overriding one or more of the
     * plugin's CSS custom properties from plain admin fields (border/
     * text/header/accent color, card radius, card shadow) — so a quick
     * branding tweak doesn't need a custom.css edit. Empty fields are
     * skipped entirely; if nothing is set, this returns an empty
     * string and no <style> tag is added at all. Covers the default
     * (light) palette only — dark-mode-specific colors still need
     * custom.css, since doubling every field for a dark variant would
     * make this settings screen unwieldy for what's meant to be a
     * quick way to match a site's brand colors, not a full theme editor.
     *
     * @return  string  A :root{...} CSS block, or '' if nothing is set.
     *
     * @since   2.0.33
     */
    private function buildAppearanceOverrideCss(): string
    {
        $map = [
            'appearance_border_color' => '--rwd-border',
            'appearance_ink_color'    => '--rwd-ink',
            'appearance_head_color'   => '--rwd-head',
            'appearance_label_color'  => '--rwd-label',
            'appearance_card_radius'  => '--rwd-card-radius',
            'appearance_card_shadow'  => '--rwd-card-shadow',
        ];

        $declarations = [];

        foreach ($map as $param => $cssVar) {
            $value = trim((string) $this->params->get($param, ''));

            if ($value === '') {
                continue;
            }

            // These fields are admin-only (same trust level as editing
            // custom.css directly), but still strip characters that
            // could break out of the declaration block or inject markup
            // as a defense-in-depth measure, not because the value is
            // treated as untrusted input.
            $value = str_replace(['{', '}', '<', '>'], '', $value);

            $declarations[] = $cssVar . ':' . $value . ';';
        }

        if (!$declarations) {
            return '';
        }

        return ':root{' . implode('', $declarations) . '}';
    }
}
