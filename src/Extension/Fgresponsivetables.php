<?php

/**
 * @package     Joomla.Plugin
 * @subpackage  System.fgresponsivetables
 *
 * @copyright   (C) 2026 Fero
 * @license     GNU General Public License version 2 or later
 */

namespace FG\Plugin\System\Fgresponsivetables\Extension;

defined('_JEXEC') or die;

use Joomla\CMS\Document\HtmlDocument;
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

        $document = $app->getDocument();

        if (!$document instanceof HtmlDocument) {
            return;
        }

        $wa = $document->getWebAssetManager();
        $wa->getRegistry()->addExtensionRegistryFile('plg_system_fgresponsivetables');
        $wa->useStyle('plg_system_fgresponsivetables.tables')
            ->useScript('plg_system_fgresponsivetables.tables');

        if ((int) $this->params->get('load_legacy', 1) === 1) {
            $wa->useStyle('plg_system_fgresponsivetables.legacy');
        }

        $document->addScriptOptions('plg_system_fgresponsivetables', [
            'selector'    => (string) $this->params->get('selector', 'table.responsiv'),
            'autoLabels'  => (int) $this->params->get('auto_labels', 1) === 1,
            'autoClass'   => (int) $this->params->get('auto_class', 0) === 1,
            'wrap'        => (int) $this->params->get('wrap', 1) === 1,
            'breakpoint'  => (int) $this->params->get('breakpoint', 600),
            'ariaRoles'   => (int) $this->params->get('aria_roles', 1) === 1,
            'cardStyle'   => (string) $this->params->get('card_style', 'card'),
            'clearFloats' => (int) $this->params->get('clear_floats', 0) === 1,
            'exclude'     => (string) $this->params->get('exclude', 'table.no-responsiv, .no-responsiv table'),
        ]);
    }
}
