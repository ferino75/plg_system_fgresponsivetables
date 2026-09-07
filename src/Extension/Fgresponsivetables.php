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
            'exclude'     => (string) $this->params->get('exclude', 'table.no-responsiv, .no-responsiv table'),
        ]);
    }
}
