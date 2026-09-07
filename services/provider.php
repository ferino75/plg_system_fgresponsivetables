<?php

/**
 * @package     Joomla.Plugin
 * @subpackage  System.fgresponsivetables
 *
 * @copyright   (C) 2026 Fero
 * @license     GNU General Public License version 2 or later
 */

defined('_JEXEC') or die;

use Joomla\CMS\Extension\PluginInterface;
use Joomla\CMS\Factory;
use Joomla\CMS\Plugin\PluginHelper;
use Joomla\DI\Container;
use Joomla\DI\ServiceProviderInterface;
use Joomla\Event\DispatcherInterface;
use FG\Plugin\System\Fgresponsivetables\Extension\Fgresponsivetables;

return new class () implements ServiceProviderInterface {
    /**
     * Registers the service provider with a DI container.
     *
     * @param   Container  $container  The DI container.
     *
     * @return  void
     *
     * @since   1.0.0
     */
    public function register(Container $container): void
    {
        $container->set(
            PluginInterface::class,
            function (Container $container) {
                $plugin = new Fgresponsivetables(
                    $container->get(DispatcherInterface::class),
                    (array) PluginHelper::getPlugin('system', 'fgresponsivetables')
                );
                $plugin->setApplication(Factory::getApplication());

                return $plugin;
            }
        );
    }
};
